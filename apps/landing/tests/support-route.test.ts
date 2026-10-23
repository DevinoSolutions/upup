import { randomUUID } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SUPPORT_CONFIRMATION_REPLY_LINE } from '@/lib/support/reply-time'

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

    it('reports the PostHog leg as skipped (not failed) on the disabled dataset', async () => {
        const POST = await loadRoute()
        const res = await POST(makeRequest(payload()))
        const body = await res.json()

        expect(h.postHogCtor).not.toHaveBeenCalled()
        expect(body.posthog).toBe('skipped')
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
        // The team notification, then the submitter's confirmation (this
        // submission has an address); the notification is always call 0.
        expect(h.fetchMock).toHaveBeenCalledTimes(2)
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

describe('submitter confirmation email via Sendly (T-6725)', () => {
    const withEmail = (over: Record<string, unknown> = {}) =>
        payload({ wantsReply: true, email: 'dev@example.com', ...over })

    /** Sendly stub whose confirmation sends (idempotency key `<id>:confirm`) are handled by `onConfirm`. */
    const stubSendly = (onConfirm: () => Response | Promise<Response>) =>
        h.fetchMock.mockImplementation(
            async (_url: string, init: RequestInit) => {
                const key = (init.headers as Record<string, string>)[
                    'idempotency-key'
                ]
                return key.endsWith(':confirm')
                    ? onConfirm()
                    : new Response('{}', { status: 202 })
            },
        )

    it('sends the submitter one confirmation with their id, an escaped echo and the reply promise', async () => {
        const POST = await loadRoute(ENABLED_ENV)
        const id = randomUUID()
        const res = await POST(
            makeRequest(
                withEmail({
                    feedbackId: id,
                    message: '<b>hi</b> {{#if a}} line1\nline2',
                }),
            ),
        )
        const body = await res.json()

        expect(res.status).toBe(200)
        expect(body.confirmation).toBe('ok')
        expect(h.fetchMock).toHaveBeenCalledTimes(2)

        // Leg 0 is still the team notification, untouched.
        expect(sentMail(0).body.to).toBe('hello@devino.ca')

        const confirm = sentMail(1)
        expect(confirm.url).toBe('https://api.sendly.now/api/v1/emails')
        expect(confirm.headers.authorization).toBe(
            'Bearer pk_test_not_a_real_key',
        )
        expect(confirm.headers['idempotency-key']).toBe(`${id}:confirm`)
        expect(confirm.body.to).toBe('dev@example.com')
        expect(confirm.body.from).toBe('upup-support@useupup.com')
        // A reply to the confirmation lands in the team inbox.
        expect(confirm.body.reply).toBe('hello@devino.ca')
        expect(confirm.body.subject).toContain(id)
        expect(confirm.body.subject).toMatch(/got your message/i)

        const html = confirm.body.body
        expect(html).toContain(id)
        expect(html).toContain(SUPPORT_CONFIRMATION_REPLY_LINE)
        expect(html).toContain('within 1 business day')
        expect(html).toContain('&lt;b&gt;hi&lt;/b&gt;')
        expect(html).not.toContain('<b>')
        expect(html).not.toContain('{{')
        expect(html).toContain('&#123;&#123;#if a&#125;&#125;')
        expect(html).toContain('line1<br>')
    })

    it('truncates a long echoed message to 2000 characters with an ellipsis', async () => {
        const POST = await loadRoute(ENABLED_ENV)
        await POST(makeRequest(withEmail({ message: 'a'.repeat(4500) })))

        const html = sentMail(1).body.body
        expect(html).toContain('a'.repeat(2000) + '…')
        expect(html).not.toContain('a'.repeat(2001))
        // The team notification keeps the full text.
        expect(sentMail(0).body.body).toContain('a'.repeat(4500))
    })

    it('echoes a short message whole, with no ellipsis', async () => {
        const POST = await loadRoute(ENABLED_ENV)
        await POST(makeRequest(withEmail({ message: 'short and sweet' })))
        expect(sentMail(1).body.body).toContain('short and sweet')
        expect(sentMail(1).body.body).not.toContain('…')
    })

    it('sends nothing to the submitter when no email was given', async () => {
        const POST = await loadRoute(ENABLED_ENV)
        const res = await POST(makeRequest(payload()))
        const body = await res.json()

        expect(body.confirmation).toBe('skipped')
        expect(h.fetchMock).toHaveBeenCalledTimes(1)
        expect(sentMail(0).body.to).toBe('hello@devino.ca')
    })

    it('reports not_configured without calling Sendly when SENDLY_API_KEY is absent', async () => {
        const POST = await loadRoute({
            POSTHOG_DATASET: 'e2e',
            NEXT_PUBLIC_POSTHOG_E2E_TEST_PROJECT_HOST:
                'https://e2e.posthog.test',
            NEXT_PUBLIC_POSTHOG_E2E_TEST_PROJECT_CAPTURE_TOKEN: 'phc_e2e_token',
        })
        const res = await POST(makeRequest(withEmail()))
        const body = await res.json()

        expect(body.confirmation).toBe('not_configured')
        expect(h.fetchMock).not.toHaveBeenCalled()
    })

    it('mails one confirmation per normalized address per 24h, while the team notification always goes out', async () => {
        const POST = await loadRoute(ENABLED_ENV)

        const first = await (
            await POST(makeRequest(withEmail({ email: 'Dev+one@Example.com' })))
        ).json()
        const second = await (
            await POST(makeRequest(withEmail({ email: 'dev+two@example.com' })))
        ).json()

        expect(first.confirmation).toBe('ok')
        expect(second.confirmation).toBe('throttled')
        expect(second.ok).toBe(true)
        // 2 team notifications + 1 confirmation.
        expect(h.fetchMock).toHaveBeenCalledTimes(3)
        const recipients = h.fetchMock.mock.calls.map(
            (_call, i) => sentMail(i).body.to,
        )
        expect(recipients.filter(to => to === 'hello@devino.ca')).toHaveLength(
            2,
        )
        expect(
            recipients.filter(to => to.toLowerCase().startsWith('dev+')),
        ).toHaveLength(1)
    })

    it('does not let one address throttle another', async () => {
        const POST = await loadRoute(ENABLED_ENV)
        const a = await (
            await POST(makeRequest(withEmail({ email: 'a@example.com' })))
        ).json()
        const b = await (
            await POST(makeRequest(withEmail({ email: 'b@example.com' })))
        ).json()
        expect([a.confirmation, b.confirmation]).toEqual(['ok', 'ok'])
    })

    it('mails the same address again once 24h have passed', async () => {
        vi.useFakeTimers({ toFake: ['Date'] })
        try {
            const POST = await loadRoute(ENABLED_ENV)
            const first = await (await POST(makeRequest(withEmail()))).json()
            vi.setSystemTime(Date.now() + 24 * 60 * 60 * 1000 + 1000)
            const later = await (await POST(makeRequest(withEmail()))).json()
            expect([first.confirmation, later.confirmation]).toEqual([
                'ok',
                'ok',
            ])
        } finally {
            vi.useRealTimers()
        }
    })

    it('never fails the request when only the confirmation send fails, and frees the slot for a retry', async () => {
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        let failConfirm = true
        stubSendly(() => {
            if (failConfirm) throw new Error('ECONNRESET')
            return new Response('{}', { status: 202 })
        })
        const POST = await loadRoute(ENABLED_ENV)

        const res = await POST(makeRequest(withEmail()))
        const body = await res.json()
        expect(res.status).toBe(200)
        expect(body.ok).toBe(true)
        expect(body.email).toBe('ok')
        expect(body.posthog).toBe('ok')
        expect(body.confirmation).toBe('failed')
        expect(JSON.stringify(errorSpy.mock.calls)).not.toContain(
            'pk_test_not_a_real_key',
        )

        // A failed send must not burn the address's daily allowance.
        failConfirm = false
        const retry = await (await POST(makeRequest(withEmail()))).json()
        expect(retry.confirmation).toBe('ok')
    })

    it('reports a non-2xx confirmation as failed without failing the request', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {})
        stubSendly(() => new Response('{"code":"forbidden"}', { status: 403 }))
        const POST = await loadRoute(ENABLED_ENV)
        const res = await POST(makeRequest(withEmail()))
        const body = await res.json()
        expect(res.status).toBe(200)
        expect(body.confirmation).toBe('failed')
    })

    it('does not confirm a submission that was recorded nowhere', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {})
        h.captureMock.mockImplementation(() => {
            throw new Error('posthog down')
        })
        h.fetchMock.mockRejectedValue(new Error('network down'))
        const POST = await loadRoute(ENABLED_ENV)
        const res = await POST(makeRequest(withEmail()))
        const body = await res.json()

        expect(res.status).toBe(502)
        expect(body.confirmation).toBe('skipped')
        // Only the (failed) team notification was attempted.
        expect(h.fetchMock).toHaveBeenCalledTimes(1)
    })

    it('replays a duplicate feedbackId without mailing the submitter again', async () => {
        const POST = await loadRoute(ENABLED_ENV)
        const req = withEmail()
        const first = await (await POST(makeRequest(req))).json()
        const second = await (await POST(makeRequest(req))).json()

        expect(second).toEqual(first)
        expect(h.fetchMock).toHaveBeenCalledTimes(2)
    })

    it('sends nothing for a honeypot-filled submission', async () => {
        const POST = await loadRoute(ENABLED_ENV)
        const res = await POST(makeRequest(withEmail({ website: 'spam-bot' })))
        expect((await res.json()).confirmation).toBe('skipped')
        expect(h.fetchMock).not.toHaveBeenCalled()
    })
})

describe('POST /api/upup-support input hardening (T-5495)', () => {
    it('rejects a body whose content-length exceeds 32 KiB with 413 before parsing it', async () => {
        const POST = await loadRoute(ENABLED_ENV)
        const req = makeRequest(payload(), {
            'content-length': String(32 * 1024 + 1),
        })
        const res = await POST(req)
        expect(res.status).toBe(413)
        expect(h.captureMock).not.toHaveBeenCalled()
        expect(h.fetchMock).not.toHaveBeenCalled()
    })

    it('rejects an oversized body that under-reports content-length, by counting the bytes actually read', async () => {
        const POST = await loadRoute(ENABLED_ENV)
        const huge =
            JSON.stringify(payload({ message: 'x' })) + ' '.repeat(40_000)
        const req = new Request('http://localhost/api/upup-support', {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'x-forwarded-for': '203.0.113.11',
                'content-length': '100',
            },
            body: huge,
        })
        const res = await POST(req)
        expect(res.status).toBe(413)
        expect(h.captureMock).not.toHaveBeenCalled()
    })

    it('still accepts a maximum-length message well under the cap', async () => {
        const POST = await loadRoute(ENABLED_ENV)
        const res = await POST(
            makeRequest(payload({ message: 'é'.repeat(5000) }), {
                'x-forwarded-for': '203.0.113.12',
            }),
        )
        expect(res.status).toBe(200)
    })

    it('keeps a forged distinct id out of the captured event and the email, attributing to the anonymous feedback id instead', async () => {
        const POST = await loadRoute(ENABLED_ENV)
        const id = randomUUID()
        const res = await POST(
            makeRequest(
                payload({
                    feedbackId: id,
                    posthogDistinctId: 'victim@example.com',
                }),
                { 'x-forwarded-for': '203.0.113.13' },
            ),
        )
        expect(res.status).toBe(200)
        const captureArg = h.captureMock.mock.calls[0][0]
        expect(captureArg.distinctId).toBe(`anonymous:${id}`)
        expect(sentMail().body.body).not.toContain('victim@example.com')
    })

    it('does not let a user-agent header carry control characters into the email', async () => {
        const POST = await loadRoute(ENABLED_ENV)
        const res = await POST(
            makeRequest(payload(), {
                'x-forwarded-for': '203.0.113.14',
                'user-agent': 'agent\u0001/1.0',
            }),
        )
        expect(res.status).toBe(200)
        expect(sentMail().body.body).not.toContain('\u0001')
    })
})

describe('POST /api/upup-support follow-up hardening (T-5941)', () => {
    it('collapses CR/LF in the user-agent so it cannot forge email-body lines', async () => {
        const POST = await loadRoute(ENABLED_ENV)
        // Headers rejects CR/LF at construction, so stub the lookup: this pins
        // the route's own defense for any runtime that lets one through.
        const req = makeRequest(payload(), {
            'x-forwarded-for': '203.0.113.21',
        })
        const realGet = req.headers.get.bind(req.headers)
        req.headers.get = (name: string) =>
            name.toLowerCase() === 'user-agent'
                ? 'agent/1.0\r\nApp: forged @ 9.9.9'
                : realGet(name)
        const res = await POST(req)
        expect(res.status).toBe(200)
        const text = sentMail().body.body
        expect(text).toContain('Platform: agent/1.0 App: forged @ 9.9.9')
        expect(text).not.toContain('<br>\nApp: forged')
    })

    it('caps the user-agent at 200 characters', async () => {
        const POST = await loadRoute(ENABLED_ENV)
        const res = await POST(
            makeRequest(payload(), {
                'x-forwarded-for': '203.0.113.22',
                'user-agent': 'u'.repeat(500),
            }),
        )
        expect(res.status).toBe(200)
        expect(sentMail().body.body).toContain(
            `Platform: ${'u'.repeat(200)}<br>`,
        )
    })

    it('answers 400, not 413, for a JSON body that is the literal string "too-large"', async () => {
        const POST = await loadRoute(ENABLED_ENV)
        const res = await POST(
            makeRequest('too-large', { 'x-forwarded-for': '203.0.113.23' }),
        )
        expect(res.status).toBe(400)
    })

    it('answers 413 for a streamed body with no content-length that exceeds the cap', async () => {
        const POST = await loadRoute(ENABLED_ENV)
        const chunk = new TextEncoder().encode('x'.repeat(8 * 1024))
        const stream = new ReadableStream<Uint8Array>({
            start(controller) {
                for (let i = 0; i < 5; i++) controller.enqueue(chunk)
                controller.close()
            },
        })
        const req = new Request('http://localhost/api/upup-support', {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'x-forwarded-for': '203.0.113.24',
            },
            body: stream,
            duplex: 'half',
        } as RequestInit)
        expect(req.headers.get('content-length')).toBeNull()
        const res = await POST(req)
        expect(res.status).toBe(413)
    })

    it('answers 400 for invalid JSON under the cap', async () => {
        const POST = await loadRoute(ENABLED_ENV)
        const req = new Request('http://localhost/api/upup-support', {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'x-forwarded-for': '203.0.113.25',
            },
            body: '{not json',
        })
        const res = await POST(req)
        expect(res.status).toBe(400)
    })

    it('measures the cap in bytes, not characters: a multi-byte body under 32K chars but over 32 KiB gets 413', async () => {
        const POST = await loadRoute(ENABLED_ENV)
        const body =
            JSON.stringify(payload({ route: 'é'.repeat(100) })) +
            'é'.repeat(17_000)
        expect(body.length).toBeLessThan(32 * 1024)
        const req = new Request('http://localhost/api/upup-support', {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'x-forwarded-for': '203.0.113.26',
                'content-length': '100',
            },
            body,
        })
        const res = await POST(req)
        expect(res.status).toBe(413)
    })
})
