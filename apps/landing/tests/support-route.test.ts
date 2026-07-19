import { randomUUID } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the two external boundaries (unit layer — the route logic is what we
// exercise, not the real PostHog/SMTP services). Hoisted fns stay stable across
// vi.resetModules() so each test can inspect and re-program them.
const h = vi.hoisted(() => ({
    captureMock: vi.fn(),
    shutdownMock: vi.fn(),
    postHogCtor: vi.fn(),
    sendMailMock: vi.fn(),
    createTransport: vi.fn(),
}))

vi.mock('posthog-node', () => ({ PostHog: h.postHogCtor }))
vi.mock('nodemailer', () => ({
    default: { createTransport: h.createTransport },
}))

const MANAGED_ENV = [
    'POSTHOG_DATASET',
    'NEXT_PUBLIC_POSTHOG_KEY',
    'NEXT_PUBLIC_POSTHOG_HOST',
    'NEXT_PUBLIC_POSTHOG_DATASET',
    'NEXT_PUBLIC_POSTHOG_E2E_TEST_PROJECT_HOST',
    'NEXT_PUBLIC_POSTHOG_E2E_TEST_PROJECT_CAPTURE_TOKEN',
    'SMTP_URL',
    'SUPPORT_EMAIL_TO',
    'SUPPORT_EMAIL_FROM',
]

// Analytics + email fully wired to the (mocked) boundaries.
const ENABLED_ENV: Record<string, string> = {
    POSTHOG_DATASET: 'e2e',
    NEXT_PUBLIC_POSTHOG_E2E_TEST_PROJECT_HOST: 'https://e2e.posthog.test',
    NEXT_PUBLIC_POSTHOG_E2E_TEST_PROJECT_CAPTURE_TOKEN: 'phc_e2e_token',
    SMTP_URL: 'smtp://user:pass@localhost:2525',
}

type PostHandler = (req: Request) => Promise<Response>

async function loadRoute(
    envOverrides: Record<string, string> = {},
): Promise<PostHandler> {
    vi.resetModules()
    for (const key of MANAGED_ENV) delete process.env[key]
    for (const [key, value] of Object.entries(envOverrides)) {
        process.env[key] = value
    }
    const mod = await import('@/app/api/upup-support/route')
    return mod.POST
}

function makeRequest(
    body: unknown,
    headers: Record<string, string> = {},
): Request {
    return new Request('http://localhost/api/upup-support', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'user-agent': 'vitest-agent',
            'x-forwarded-for': '203.0.113.10',
            ...headers,
        },
        body: JSON.stringify(body),
    })
}

const payload = (over: Record<string, unknown> = {}) => ({
    type: 'problem',
    message: 'Upload stalls at 50% on large files.',
    wantsReply: false,
    feedbackId: randomUUID(),
    ...over,
})

beforeEach(() => {
    h.captureMock.mockReset()
    h.shutdownMock.mockReset().mockResolvedValue(undefined)
    // A normal function (not an arrow) so `new PostHog(...)` can construct it.
    h.postHogCtor.mockReset().mockImplementation(function PostHog() {
        return { capture: h.captureMock, shutdown: h.shutdownMock }
    })
    h.sendMailMock.mockReset().mockResolvedValue({ messageId: 'test' })
    h.createTransport.mockReset().mockImplementation(() => ({
        sendMail: h.sendMailMock,
    }))
})

describe('POST /api/upup-support', () => {
    it('silently accepts a honeypot-filled submission without capturing or sending', async () => {
        const POST = await loadRoute(ENABLED_ENV)
        const res = await POST(makeRequest(payload({ website: 'spam-bot' })))
        const body = await res.json()

        expect(res.status).toBe(200)
        expect(body.ok).toBe(true)
        expect(h.postHogCtor).not.toHaveBeenCalled()
        expect(h.sendMailMock).not.toHaveBeenCalled()
    })

    it('rejects an invalid payload with 400', async () => {
        const POST = await loadRoute(ENABLED_ENV)
        const res = await POST(makeRequest(payload({ message: '' })))
        expect(res.status).toBe(400)
    })

    it('carries the same feedbackId into the captured event and the email', async () => {
        const POST = await loadRoute(ENABLED_ENV)
        const id = randomUUID()
        const res = await POST(makeRequest(payload({ feedbackId: id })))

        expect(res.status).toBe(200)
        const captureArg = h.captureMock.mock.calls[0][0]
        expect(captureArg.properties.feedback_id).toBe(id)

        const mailArg = h.sendMailMock.mock.calls[0][0]
        expect(mailArg.subject).toContain(id)
        expect(mailArg.text).toContain(id)
    })

    it('still sends the email when the PostHog leg throws', async () => {
        h.captureMock.mockImplementation(() => {
            throw new Error('posthog down')
        })
        const POST = await loadRoute(ENABLED_ENV)
        const res = await POST(makeRequest(payload()))
        const body = await res.json()

        expect(res.status).toBe(200)
        expect(body.posthog).toBe('failed')
        expect(body.email).toBe('ok')
        expect(h.sendMailMock).toHaveBeenCalledTimes(1)
    })

    it('still captures the event when the email leg throws', async () => {
        h.sendMailMock.mockRejectedValue(new Error('smtp down'))
        const POST = await loadRoute(ENABLED_ENV)
        const res = await POST(makeRequest(payload()))
        const body = await res.json()

        expect(res.status).toBe(200)
        expect(body.posthog).toBe('ok')
        expect(body.email).toBe('failed')
    })

    it('returns 502 when both the PostHog and email legs fail', async () => {
        h.captureMock.mockImplementation(() => {
            throw new Error('posthog down')
        })
        h.sendMailMock.mockRejectedValue(new Error('smtp down'))
        const POST = await loadRoute(ENABLED_ENV)
        const res = await POST(makeRequest(payload()))
        const body = await res.json()

        expect(res.status).toBe(502)
        expect(body.ok).toBe(false)
        expect(body.posthog).toBe('failed')
        expect(body.email).toBe('failed')
    })

    it('replays the same response for a duplicate feedbackId without re-capturing or re-sending', async () => {
        const POST = await loadRoute(ENABLED_ENV)
        const req = payload()

        const first = await POST(makeRequest(req))
        const firstBody = await first.json()
        expect(first.status).toBe(200)
        expect(h.captureMock).toHaveBeenCalledTimes(1)
        expect(h.sendMailMock).toHaveBeenCalledTimes(1)

        const second = await POST(makeRequest(req))
        const secondBody = await second.json()
        expect(second.status).toBe(200)
        expect(secondBody).toEqual(firstBody)
        expect(h.captureMock).toHaveBeenCalledTimes(1)
        expect(h.sendMailMock).toHaveBeenCalledTimes(1)
    })

    it('returns 429 once the per-IP rate limit is exhausted', async () => {
        const POST = await loadRoute()
        let last: Response | undefined
        for (let i = 0; i < 6; i++) {
            last = await POST(makeRequest(payload()))
        }
        expect(last?.status).toBe(429)
    })

    it('no-ops the PostHog client entirely on the disabled dataset', async () => {
        const POST = await loadRoute()
        const res = await POST(makeRequest(payload()))
        const body = await res.json()

        expect(h.postHogCtor).not.toHaveBeenCalled()
        expect(body.posthog).toBe('failed')
        expect(body.email).toBe('not_configured')
    })

    it('never puts the submitter email into the captured event properties', async () => {
        const POST = await loadRoute(ENABLED_ENV)
        const res = await POST(
            makeRequest(
                payload({ wantsReply: true, email: 'secret@example.com' }),
            ),
        )
        expect(res.status).toBe(200)

        const captureArg = h.captureMock.mock.calls[0][0]
        const serialized = JSON.stringify(captureArg.properties)
        expect(serialized).not.toContain('secret@example.com')
        expect(captureArg.properties.has_email).toBe(true)
    })
})
