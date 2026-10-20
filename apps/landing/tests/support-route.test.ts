import { randomUUID } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the two external boundaries (unit layer — the route logic is what we
// exercise, not the real PostHog/Sendly services). Hoisted fns stay stable across
// vi.resetModules() so each test can inspect and re-program them.
const h = vi.hoisted(() => ({
    captureMock: vi.fn(),
    shutdownMock: vi.fn(),
    postHogCtor: vi.fn(),
    fetchMock: vi.fn(),
}))

vi.mock('posthog-node', () => ({ PostHog: h.postHogCtor }))

const MANAGED_ENV = [
    'POSTHOG_DATASET',
    'NEXT_PUBLIC_POSTHOG_KEY',
    'NEXT_PUBLIC_POSTHOG_HOST',
    'NEXT_PUBLIC_POSTHOG_DATASET',
    'NEXT_PUBLIC_POSTHOG_E2E_TEST_PROJECT_HOST',
    'NEXT_PUBLIC_POSTHOG_E2E_TEST_PROJECT_CAPTURE_TOKEN',
    'POSTHOG_E2E_TEST_PROJECT_QUERY_READ_ONLY_PERSONAL_API_KEY',
    'SENDLY_API_KEY',
    'SUPPORT_EMAIL_TO',
    'SUPPORT_EMAIL_FROM',
]

// Analytics + email fully wired to the (mocked) boundaries.
const ENABLED_ENV: Record<string, string> = {
    POSTHOG_DATASET: 'e2e',
    NEXT_PUBLIC_POSTHOG_E2E_TEST_PROJECT_HOST: 'https://e2e.posthog.test',
    NEXT_PUBLIC_POSTHOG_E2E_TEST_PROJECT_CAPTURE_TOKEN: 'phc_e2e_token',
    SENDLY_API_KEY: 'pk_test_not_a_real_key',
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
    // Sendly accepts a send with 202 and a receipt.
    h.fetchMock.mockReset().mockResolvedValue(
        new Response(
            JSON.stringify({
                id: 'em_1',
                status: 'PENDING',
                to: 'hello@devino.ca',
                from: 'upup-support@useupup.com',
            }),
            { status: 202 },
        ),
    )
    vi.stubGlobal('fetch', h.fetchMock)
})

afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
})

/** The Sendly request the email leg made: url, headers and parsed JSON body. */
function sentMail(index = 0) {
    const [url, init] = h.fetchMock.mock.calls[index] as [string, RequestInit]
    return {
        url,
        init,
        headers: init.headers as Record<string, string>,
        body: JSON.parse(init.body as string) as Record<string, string>,
    }
}

describe('POST /api/upup-support', () => {
    it('silently accepts a honeypot-filled submission without capturing or sending', async () => {
        const POST = await loadRoute(ENABLED_ENV)
        const res = await POST(makeRequest(payload({ website: 'spam-bot' })))
        const body = await res.json()

        expect(res.status).toBe(200)
        expect(body.ok).toBe(true)
        expect(h.postHogCtor).not.toHaveBeenCalled()
        expect(h.fetchMock).not.toHaveBeenCalled()
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

        const mail = sentMail()
        expect(mail.body.subject).toContain(id)
        expect(mail.body.body).toContain(id)
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
        expect(h.fetchMock).toHaveBeenCalledTimes(1)
    })

    it('still captures the event when the email leg throws', async () => {
        h.fetchMock.mockRejectedValue(new Error('network down'))
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
        h.fetchMock.mockRejectedValue(new Error('network down'))
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
        expect(h.fetchMock).toHaveBeenCalledTimes(1)

        const second = await POST(makeRequest(req))
        const secondBody = await second.json()
        expect(second.status).toBe(200)
        expect(secondBody).toEqual(firstBody)
        expect(h.captureMock).toHaveBeenCalledTimes(1)
        expect(h.fetchMock).toHaveBeenCalledTimes(1)
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

    it('merges testRunId / testScenario into the captured event on the e2e dataset', async () => {
        const POST = await loadRoute(ENABLED_ENV)
        const res = await POST(
            makeRequest(
                payload({
                    testRunId: 'e2e:1700000000-abc',
                    testScenario: 'support-happy-path',
                }),
            ),
        )
        expect(res.status).toBe(200)

        const captureArg = h.captureMock.mock.calls[0][0]
        expect(captureArg.properties.test_run_id).toBe('e2e:1700000000-abc')
        expect(captureArg.properties.test_scenario).toBe('support-happy-path')
        expect(captureArg.properties.environment).toBe('e2e')
    })

    it('ignores testRunId / testScenario on the production dataset', async () => {
        const POST = await loadRoute({
            POSTHOG_DATASET: 'production',
            NEXT_PUBLIC_POSTHOG_KEY: 'phc_prod_key',
            NEXT_PUBLIC_POSTHOG_HOST: 'https://prod.posthog.test',
        })
        const res = await POST(
            makeRequest(
                payload({
                    testRunId: 'e2e:1700000000-abc',
                    testScenario: 'support-happy-path',
                }),
            ),
        )
        expect(res.status).toBe(200)

        const captureArg = h.captureMock.mock.calls[0][0]
        expect(captureArg.properties.test_run_id).toBeUndefined()
        expect(captureArg.properties.test_scenario).toBeUndefined()
    })

    it('accepts a provider_notify submission from the homepage modal', async () => {
        const POST = await loadRoute(ENABLED_ENV)
        const res = await POST(
            makeRequest(
                payload({
                    type: 'provider_notify',
                    message:
                        'Notify-me request from the homepage for the Vercel Blob integration.',
                    wantsReply: true,
                    email: 'dev@example.com',
                }),
            ),
        )
        const body = await res.json()

        expect(res.status).toBe(200)
        expect(body.ok).toBe(true)

        // The type reaches both legs, so provider interest is filterable in
        // analytics and identifiable in the inbox.
        const captureArg = h.captureMock.mock.calls[0][0]
        expect(captureArg.properties.feedback_type).toBe('provider_notify')
        // ...and the event names the form it came from, not the support page.
        expect(captureArg.properties.feedback_source).toBe(
            'homepage_provider_notify',
        )
        const mail = sentMail()
        expect(mail.body.subject).toContain('provider_notify')
        expect(mail.body.body).toContain('Vercel Blob')
        // The address is the reply-to only — never the sender.
        expect(mail.body.reply).toBe('dev@example.com')
        expect(mail.body.from).not.toBe('dev@example.com')
    })

    it('drops a honeypot-filled provider_notify submission silently', async () => {
        const POST = await loadRoute(ENABLED_ENV)
        const res = await POST(
            makeRequest(
                payload({
                    type: 'provider_notify',
                    wantsReply: true,
                    email: 'bot@example.com',
                    website: 'spam-bot',
                }),
            ),
        )

        expect(res.status).toBe(200)
        expect(h.postHogCtor).not.toHaveBeenCalled()
        expect(h.fetchMock).not.toHaveBeenCalled()
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

describe('support email leg via Sendly', () => {
    it('POSTs one transactional email to the Sendly v1 endpoint with a Bearer key', async () => {
        const POST = await loadRoute({
            ...ENABLED_ENV,
            SUPPORT_EMAIL_FROM: 'upup-support@useupup.com',
            SUPPORT_EMAIL_TO: 'hello@devino.ca',
        })
        const id = randomUUID()
        const res = await POST(
            makeRequest(
                payload({ feedbackId: id, wantsReply: true, email: 'a@b.co' }),
            ),
        )
        const body = await res.json()

        expect(body.email).toBe('ok')
        expect(h.fetchMock).toHaveBeenCalledTimes(1)
        const mail = sentMail()
        expect(mail.url).toBe('https://api.sendly.now/api/v1/emails')
        expect(mail.init.method).toBe('POST')
        expect(mail.headers.authorization).toBe('Bearer pk_test_not_a_real_key')
        expect(mail.headers['content-type']).toBe('application/json')
        expect(mail.headers['idempotency-key']).toBe(id)
        expect(mail.body.from).toBe('upup-support@useupup.com')
        expect(mail.body.to).toBe('hello@devino.ca')
        expect(mail.body.reply).toBe('a@b.co')
        expect(mail.body.subject).toBe(`[upup support] problem — ${id}`)
    })

    it('omits reply when the submitter gave no email', async () => {
        const POST = await loadRoute(ENABLED_ENV)
        await POST(makeRequest(payload()))
        expect(sentMail().body).not.toHaveProperty('reply')
    })

    it('escapes the submission so it cannot inject HTML or template markup', async () => {
        const POST = await loadRoute(ENABLED_ENV)
        const res = await POST(
            makeRequest(
                payload({
                    message: '<script>x</script> {{#if a}} line1\nline2',
                }),
            ),
        )
        expect((await res.json()).email).toBe('ok')

        const html = sentMail().body.body
        expect(html).not.toContain('<script>')
        expect(html).toContain('&lt;script&gt;x&lt;/script&gt;')
        expect(html).not.toContain('{{')
        expect(html).toContain('&#123;&#123;#if a&#125;&#125;')
        expect(html).toContain('line1<br>')
    })

    it('reports failed (and logs status, never the key) on a non-2xx Sendly response', async () => {
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        h.fetchMock.mockResolvedValue(
            new Response('{"code":"forbidden"}', { status: 403 }),
        )
        const POST = await loadRoute(ENABLED_ENV)
        const res = await POST(makeRequest(payload()))
        const body = await res.json()

        expect(res.status).toBe(200)
        expect(body.email).toBe('failed')
        expect(body.posthog).toBe('ok')
        const logged = JSON.stringify(errorSpy.mock.calls)
        expect(logged).toContain('403')
        expect(logged).not.toContain('pk_test_not_a_real_key')
    })

    it('reports failed (and never logs the key) on a network error', async () => {
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        h.fetchMock.mockRejectedValue(new Error('ECONNRESET'))
        const POST = await loadRoute(ENABLED_ENV)
        const res = await POST(makeRequest(payload()))
        const body = await res.json()

        expect(body.email).toBe('failed')
        expect(JSON.stringify(errorSpy.mock.calls)).not.toContain(
            'pk_test_not_a_real_key',
        )
    })

    it('reports not_configured without calling Sendly when SENDLY_API_KEY is absent', async () => {
        const POST = await loadRoute({
            POSTHOG_DATASET: 'e2e',
            NEXT_PUBLIC_POSTHOG_E2E_TEST_PROJECT_HOST:
                'https://e2e.posthog.test',
            NEXT_PUBLIC_POSTHOG_E2E_TEST_PROJECT_CAPTURE_TOKEN: 'phc_e2e_token',
        })
        const res = await POST(makeRequest(payload()))
        const body = await res.json()

        expect(body.email).toBe('not_configured')
        expect(body.posthog).toBe('ok')
        expect(h.fetchMock).not.toHaveBeenCalled()
    })
})
