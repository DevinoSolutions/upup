import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Behavior contract for the four request-guard middlewares wired in
 * mastra/index.ts: CORS allowlisting, the in-memory daily request budget,
 * the per-IP token-bucket rate limiter, and origin-token HMAC auth. Each
 * one reads `env` (a singleton parsed once from process.env) either at
 * factory-call time or at module-import time, so every test here sets
 * process.env, resets the module registry, THEN dynamically imports —
 * the only way to get deterministic per-test env values and fresh
 * in-memory counters/buckets.
 */

const ENV_KEYS = [
    'ORIGIN_TOKEN_SECRET',
    'ALLOWED_ORIGINS',
    'DAILY_REQUEST_CAP',
    'RATE_LIMIT_CAPACITY',
    'RATE_LIMIT_WINDOW_MS',
] as const
type EnvKey = (typeof ENV_KEYS)[number]

const savedEnv: Partial<Record<EnvKey, string | undefined>> = {}

beforeEach(() => {
    for (const key of ENV_KEYS) savedEnv[key] = process.env[key]
})

afterEach(() => {
    for (const key of ENV_KEYS) {
        const value = savedEnv[key]
        if (value === undefined) delete process.env[key]
        else process.env[key] = value
    }
    vi.useRealTimers()
})

/** Sets the given env vars (clearing every other tracked key) then forces a fresh module registry so `lib/env.js` re-parses on next import. */
function setEnv(overrides: Partial<Record<EnvKey, string>>) {
    for (const key of ENV_KEYS) {
        const value = overrides[key]
        if (value === undefined) delete process.env[key]
        else process.env[key] = value
    }
    vi.resetModules()
}

/** Minimal Hono-shaped ctx satisfying every middleware's own local Context type (a structural superset of all four). */
function makeContext(opts: {
    method?: string
    url?: string
    headers?: Record<string, string | undefined>
}) {
    const headers = opts.headers ?? {}
    const sentHeaders: Record<string, string> = {}
    const ctx = {
        req: {
            method: opts.method ?? 'GET',
            url:
                opts.url ??
                'http://localhost/api/agents/playground-agent/generate',
            header: (name: string) => headers[name],
        },
        header: (name: string, value: string) => {
            sentHeaders[name] = value
        },
    }
    return { ctx, sentHeaders }
}

function makeNext() {
    let called = false
    const next = async () => {
        called = true
    }
    return { next, wasCalled: () => called }
}

const API_URL = 'http://localhost/api/agents/playground-agent/generate'
const HEALTHZ_URL = 'http://localhost/healthz'

describe('corsMiddleware', () => {
    it('sets ACAO + vary + credentials for an allowlisted origin and calls next', async () => {
        setEnv({ ALLOWED_ORIGINS: 'https://allowed.test.example' })
        const { corsMiddleware } = await import('./cors.js')
        const handler = corsMiddleware()
        const { ctx, sentHeaders } = makeContext({
            method: 'GET',
            headers: { origin: 'https://allowed.test.example' },
        })
        const { next, wasCalled } = makeNext()

        const response = await handler(ctx, next)

        expect(response).toBeUndefined()
        expect(wasCalled()).toBe(true)
        expect(sentHeaders['access-control-allow-origin']).toBe(
            'https://allowed.test.example',
        )
        expect(sentHeaders['vary']).toBe('origin')
        expect(sentHeaders['access-control-allow-credentials']).toBe('true')
    })

    it('sets no CORS headers for a non-allowlisted origin but still calls next', async () => {
        setEnv({ ALLOWED_ORIGINS: 'https://allowed.test.example' })
        const { corsMiddleware } = await import('./cors.js')
        const handler = corsMiddleware()
        const { ctx, sentHeaders } = makeContext({
            method: 'GET',
            headers: { origin: 'https://evil.test.example' },
        })
        const { next, wasCalled } = makeNext()

        const response = await handler(ctx, next)

        expect(response).toBeUndefined()
        expect(wasCalled()).toBe(true)
        expect(sentHeaders['access-control-allow-origin']).toBeUndefined()
    })

    it('answers an allowlisted-origin OPTIONS preflight with 204 + method/header/max-age, and skips next', async () => {
        setEnv({ ALLOWED_ORIGINS: 'https://allowed.test.example' })
        const { corsMiddleware } = await import('./cors.js')
        const handler = corsMiddleware()
        const { ctx, sentHeaders } = makeContext({
            method: 'OPTIONS',
            headers: { origin: 'https://allowed.test.example' },
        })
        const { next, wasCalled } = makeNext()

        const response = await handler(ctx, next)

        expect(response).toBeInstanceOf(Response)
        expect((response as Response).status).toBe(204)
        expect(wasCalled()).toBe(false)
        expect(sentHeaders['access-control-allow-methods']).toBe(
            'GET,POST,OPTIONS',
        )
        expect(sentHeaders['access-control-allow-headers']).toBe(
            'content-type,authorization,x-upup-origin-token',
        )
        expect(sentHeaders['access-control-max-age']).toBe('86400')
    })

    it('answers a non-allowlisted-origin OPTIONS preflight with a bare 403 and skips next', async () => {
        setEnv({ ALLOWED_ORIGINS: 'https://allowed.test.example' })
        const { corsMiddleware } = await import('./cors.js')
        const handler = corsMiddleware()
        const { ctx, sentHeaders } = makeContext({
            method: 'OPTIONS',
            headers: { origin: 'https://evil.test.example' },
        })
        const { next, wasCalled } = makeNext()

        const response = await handler(ctx, next)

        expect(response).toBeInstanceOf(Response)
        expect((response as Response).status).toBe(403)
        expect(wasCalled()).toBe(false)
        expect(Object.keys(sentHeaders)).toHaveLength(0)
    })

    it('falls back to the built-in localhost dev allowlist when ALLOWED_ORIGINS is unset', async () => {
        setEnv({})
        const { corsMiddleware } = await import('./cors.js')
        const handler = corsMiddleware()
        const { ctx, sentHeaders } = makeContext({
            method: 'GET',
            headers: { origin: 'http://localhost:5173' },
        })
        const { next } = makeNext()

        await handler(ctx, next)

        expect(sentHeaders['access-control-allow-origin']).toBe(
            'http://localhost:5173',
        )
    })
})

describe('dailyBudgetMiddleware', () => {
    it('allows requests up to the cap, then returns 503 with the friendly message', async () => {
        setEnv({ DAILY_REQUEST_CAP: '2' })
        const { dailyBudgetMiddleware } = await import('./daily-budget.js')
        const handler = dailyBudgetMiddleware()

        for (let i = 0; i < 2; i++) {
            const { ctx } = makeContext({ url: API_URL })
            const { next, wasCalled } = makeNext()
            const response = await handler(ctx, next)
            expect(response).toBeUndefined()
            expect(wasCalled()).toBe(true)
        }

        const { ctx } = makeContext({ url: API_URL })
        const { next, wasCalled } = makeNext()
        const response = await handler(ctx, next)

        expect(response).toBeInstanceOf(Response)
        expect((response as Response).status).toBe(503)
        expect(wasCalled()).toBe(false)
        const body = await (response as Response).json()
        expect(body).toEqual({
            error: 'Daily request budget reached. The AI assistant is taking a break.',
        })
    })

    it('never counts /healthz against the budget, even once the cap is exhausted', async () => {
        setEnv({ DAILY_REQUEST_CAP: '1' })
        const { dailyBudgetMiddleware } = await import('./daily-budget.js')
        const handler = dailyBudgetMiddleware()

        // Trip the cap on the real path.
        await handler(makeContext({ url: API_URL }).ctx, makeNext().next)
        const trippedResponse = await handler(
            makeContext({ url: API_URL }).ctx,
            makeNext().next,
        )
        expect(trippedResponse).toBeInstanceOf(Response)
        expect((trippedResponse as Response).status).toBe(503)

        // /healthz keeps passing through regardless of budget state.
        const { next, wasCalled } = makeNext()
        const healthzResponse = await handler(
            makeContext({ url: HEALTHZ_URL }).ctx,
            next,
        )
        expect(healthzResponse).toBeUndefined()
        expect(wasCalled()).toBe(true)
    })

    // NOTE: this pins the documented contract ("Counter resets at UTC midnight").
    // It caught a real bug on first run: the reset used to live only inside
    // tick(), which the middleware called AFTER the `count >= CAP` early
    // return — so a tripped cap 503'd forever, past midnight, until process
    // restart. Fixed in the same commit by hoisting rolloverIfNewDay() above
    // the cap check. If this test goes red again, that ordering regressed —
    // it is a src bug, not a test bug; do not "fix" it by weakening the
    // assertion.
    it('resets the counter at UTC midnight so a previously-capped client can proceed again', async () => {
        const startOfDay = Date.UTC(2026, 0, 1, 12, 0, 0)
        vi.useFakeTimers()
        vi.setSystemTime(startOfDay)

        setEnv({ DAILY_REQUEST_CAP: '1' })
        const { dailyBudgetMiddleware } = await import('./daily-budget.js')
        const handler = dailyBudgetMiddleware()

        const first = await handler(
            makeContext({ url: API_URL }).ctx,
            makeNext().next,
        )
        expect(first).toBeUndefined()
        const second = await handler(
            makeContext({ url: API_URL }).ctx,
            makeNext().next,
        )
        expect((second as Response).status).toBe(503)

        // Cross the UTC day boundary.
        vi.setSystemTime(Date.UTC(2026, 0, 2, 0, 0, 1))

        const { next, wasCalled } = makeNext()
        const afterMidnight = await handler(
            makeContext({ url: API_URL }).ctx,
            next,
        )

        expect(wasCalled()).toBe(true)
        expect(afterMidnight).toBeUndefined()
    })
})

describe('rateLimitMiddleware', () => {
    const clientHeaders = { 'x-forwarded-for': '203.0.113.5' }

    it('allows requests up to capacity, then 429s once the bucket is empty', async () => {
        vi.useFakeTimers()
        vi.setSystemTime(Date.UTC(2026, 0, 1, 0, 0, 0))
        setEnv({ RATE_LIMIT_CAPACITY: '2', RATE_LIMIT_WINDOW_MS: '1000' })
        const { rateLimitMiddleware } = await import('./rate-limit.js')
        const handler = rateLimitMiddleware()

        for (let i = 0; i < 2; i++) {
            const { next, wasCalled } = makeNext()
            const response = await handler(
                makeContext({ url: API_URL, headers: clientHeaders }).ctx,
                next,
            )
            expect(response).toBeUndefined()
            expect(wasCalled()).toBe(true)
        }

        const { next, wasCalled } = makeNext()
        const response = await handler(
            makeContext({ url: API_URL, headers: clientHeaders }).ctx,
            next,
        )

        expect(response).toBeInstanceOf(Response)
        expect((response as Response).status).toBe(429)
        expect(wasCalled()).toBe(false)
    })

    it('refills tokens linearly, so a request succeeds again after a full window elapses', async () => {
        const start = Date.UTC(2026, 0, 1, 0, 0, 0)
        vi.useFakeTimers()
        vi.setSystemTime(start)
        setEnv({ RATE_LIMIT_CAPACITY: '1', RATE_LIMIT_WINDOW_MS: '1000' })
        const { rateLimitMiddleware } = await import('./rate-limit.js')
        const handler = rateLimitMiddleware()

        const firstResponse = await handler(
            makeContext({ url: API_URL, headers: clientHeaders }).ctx,
            makeNext().next,
        )
        expect(firstResponse).toBeUndefined()

        const exhaustedResponse = await handler(
            makeContext({ url: API_URL, headers: clientHeaders }).ctx,
            makeNext().next,
        )
        expect((exhaustedResponse as Response).status).toBe(429)

        vi.setSystemTime(start + 1000)

        const { next, wasCalled } = makeNext()
        const refilledResponse = await handler(
            makeContext({ url: API_URL, headers: clientHeaders }).ctx,
            next,
        )

        expect(refilledResponse).toBeUndefined()
        expect(wasCalled()).toBe(true)
    })

    it('never rate-limits /healthz, and healthz traffic does not touch the caller bucket', async () => {
        vi.useFakeTimers()
        vi.setSystemTime(Date.UTC(2026, 0, 1, 0, 0, 0))
        setEnv({ RATE_LIMIT_CAPACITY: '1', RATE_LIMIT_WINDOW_MS: '1000' })
        const { rateLimitMiddleware } = await import('./rate-limit.js')
        const handler = rateLimitMiddleware()

        // Exhaust the real client's single token.
        await handler(
            makeContext({ url: API_URL, headers: clientHeaders }).ctx,
            makeNext().next,
        )

        // /healthz keeps passing regardless of client identity or bucket state.
        for (let i = 0; i < 5; i++) {
            const { next, wasCalled } = makeNext()
            const response = await handler(
                makeContext({ url: HEALTHZ_URL, headers: clientHeaders }).ctx,
                next,
            )
            expect(response).toBeUndefined()
            expect(wasCalled()).toBe(true)
        }

        // The real client is still exhausted — healthz calls didn't refill or consume its bucket.
        const stillExhausted = await handler(
            makeContext({ url: API_URL, headers: clientHeaders }).ctx,
            makeNext().next,
        )
        expect((stillExhausted as Response).status).toBe(429)
    })
})

describe('authMiddleware', () => {
    const origin = 'https://playground.test.example'
    const secret = 'test-secret-0000000000000000'

    function tamperSignature(token: string): string {
        const decoded = Buffer.from(token, 'base64url').toString('utf-8')
        const [hash, exp, sig] = decoded.split('.')
        const flippedChar = sig?.[0] === '0' ? '1' : '0'
        const tamperedSig = flippedChar + (sig ?? '').slice(1)
        return Buffer.from(`${hash}.${exp}.${tamperedSig}`).toString(
            'base64url',
        )
    }

    it('is a no-op that always calls next when ORIGIN_TOKEN_SECRET is unset (dormant mode)', async () => {
        setEnv({})
        const { authMiddleware } = await import('./auth.js')
        const handler = authMiddleware()
        const { ctx } = makeContext({ headers: {} }) // no token, no origin — must still pass
        const { next, wasCalled } = makeNext()

        const response = await handler(ctx, next)

        expect(response).toBeUndefined()
        expect(wasCalled()).toBe(true)
    })

    it('passes a validly signed, unexpired, matching-origin token', async () => {
        setEnv({ ORIGIN_TOKEN_SECRET: secret })
        const { authMiddleware, signOriginToken } = await import('./auth.js')
        const token = signOriginToken(origin, secret)
        const handler = authMiddleware()
        const { ctx } = makeContext({
            headers: { 'x-upup-origin-token': token, origin },
        })
        const { next, wasCalled } = makeNext()

        const response = await handler(ctx, next)

        expect(response).toBeUndefined()
        expect(wasCalled()).toBe(true)
    })

    it('rejects a request with no token when a secret is configured', async () => {
        setEnv({ ORIGIN_TOKEN_SECRET: secret })
        const { authMiddleware } = await import('./auth.js')
        const handler = authMiddleware()
        const { ctx } = makeContext({ headers: { origin } })
        const { next, wasCalled } = makeNext()

        const response = await handler(ctx, next)

        expect(response).toBeInstanceOf(Response)
        expect((response as Response).status).toBe(401)
        expect(wasCalled()).toBe(false)
    })

    it('rejects a token whose signature has been tampered with', async () => {
        setEnv({ ORIGIN_TOKEN_SECRET: secret })
        const { authMiddleware, signOriginToken } = await import('./auth.js')
        const token = signOriginToken(origin, secret)
        const tampered = tamperSignature(token)
        const handler = authMiddleware()
        const { ctx } = makeContext({
            headers: { 'x-upup-origin-token': tampered, origin },
        })
        const { next, wasCalled } = makeNext()

        const response = await handler(ctx, next)

        expect(response).toBeInstanceOf(Response)
        expect((response as Response).status).toBe(401)
        expect(wasCalled()).toBe(false)
    })

    it('rejects a token signed for a different origin than the request presents', async () => {
        setEnv({ ORIGIN_TOKEN_SECRET: secret })
        const { authMiddleware, signOriginToken } = await import('./auth.js')
        const token = signOriginToken(origin, secret)
        const handler = authMiddleware()
        const { ctx } = makeContext({
            headers: {
                'x-upup-origin-token': token,
                origin: 'https://different.test.example',
            },
        })
        const { next, wasCalled } = makeNext()

        const response = await handler(ctx, next)

        expect(response).toBeInstanceOf(Response)
        expect((response as Response).status).toBe(401)
        expect(wasCalled()).toBe(false)
    })

    it('accepts a token right up to the 15-minute TTL boundary', async () => {
        const start = Date.UTC(2026, 0, 1, 0, 0, 0)
        vi.useFakeTimers()
        vi.setSystemTime(start)
        setEnv({ ORIGIN_TOKEN_SECRET: secret })
        const { authMiddleware, signOriginToken } = await import('./auth.js')
        const token = signOriginToken(origin, secret, start)

        vi.setSystemTime(start + 15 * 60 * 1000 - 1) // 1ms before expiry

        const handler = authMiddleware()
        const { ctx } = makeContext({
            headers: { 'x-upup-origin-token': token, origin },
        })
        const { next, wasCalled } = makeNext()

        const response = await handler(ctx, next)

        expect(response).toBeUndefined()
        expect(wasCalled()).toBe(true)
    })

    it('rejects a token past the 15-minute TTL', async () => {
        const start = Date.UTC(2026, 0, 1, 0, 0, 0)
        vi.useFakeTimers()
        vi.setSystemTime(start)
        setEnv({ ORIGIN_TOKEN_SECRET: secret })
        const { authMiddleware, signOriginToken } = await import('./auth.js')
        const token = signOriginToken(origin, secret, start)

        vi.setSystemTime(start + 15 * 60 * 1000 + 1) // 1ms past expiry

        const handler = authMiddleware()
        const { ctx } = makeContext({
            headers: { 'x-upup-origin-token': token, origin },
        })
        const { next, wasCalled } = makeNext()

        const response = await handler(ctx, next)

        expect(response).toBeInstanceOf(Response)
        expect((response as Response).status).toBe(401)
        expect(wasCalled()).toBe(false)
    })
})
