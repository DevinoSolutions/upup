import type { PostHog } from 'posthog-js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { submitAndRecordProviderInterest } from '@/components/HomepageFeatures/notify-signup'
import { PROVIDER_NOTIFY_SIGNUP } from '@/lib/analytics/contract'
import {
    resetPostHogClientForTests,
    setPostHogClient,
} from '@/lib/analytics/posthog-client'

// The "Notify me" modal's post-submit flow: POST the route (carrying the
// visitor's PostHog ids), and record the browser-side sign-up ONLY after the
// server confirmed it.

const INPUT = {
    email: 'ada@example.com',
    providerName: 'Vercel Blob',
    isCustom: false,
    feedbackId: '3f0e8a52-5b1c-4c39-9d5f-1f6f0f9b7c11',
    website: '',
}

function fakePostHog() {
    return {
        get_session_id: vi.fn(() => 'session-123'),
        get_distinct_id: vi.fn(() => 'distinct-456'),
        get_property: vi.fn(() => 'anonymous'),
        identify: vi.fn(),
        capture: vi.fn(),
    }
}

function mockFetch(response: Response | Error) {
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => {
        if (response instanceof Error) throw response
        return response
    })
    vi.stubGlobal('fetch', fetchMock)
    return fetchMock
}

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status })

afterEach(() => {
    resetPostHogClientForTests()
    vi.unstubAllGlobals()
})

describe('submitAndRecordProviderInterest', () => {
    it('sends the PostHog session and distinct ids to the route', async () => {
        const posthog = fakePostHog()
        setPostHogClient(posthog as unknown as PostHog)
        const fetchMock = mockFetch(json({ ok: true }))

        await submitAndRecordProviderInterest(INPUT)

        expect(fetchMock).toHaveBeenCalledTimes(1)
        const [url, init] = fetchMock.mock.calls[0]
        expect(url).toBe('/api/upup-support/')
        expect(JSON.parse(init.body as string)).toMatchObject({
            type: 'provider_notify',
            feedbackId: INPUT.feedbackId,
            posthogSessionId: 'session-123',
            posthogDistinctId: 'distinct-456',
        })
    })

    it('records the sign-up in the browser once the server confirms it', async () => {
        const posthog = fakePostHog()
        setPostHogClient(posthog as unknown as PostHog)
        mockFetch(json({ ok: true }))

        await expect(submitAndRecordProviderInterest(INPUT)).resolves.toBe(true)

        expect(posthog.identify).toHaveBeenCalledWith(
            `signup:${INPUT.feedbackId}`,
        )
        expect(posthog.capture).toHaveBeenCalledWith(
            PROVIDER_NOTIFY_SIGNUP,
            expect.objectContaining({ feedback_id: INPUT.feedbackId }),
        )
    })

    it.each([
        ['a non-2xx response', () => json({ ok: false }, 500)],
        ['an ok:false body', () => json({ ok: false })],
        ['an unparseable body', () => new Response('nope', { status: 200 })],
        ['a network error', () => new Error('offline')],
    ])('skips the browser record on %s', async (_label, make) => {
        const posthog = fakePostHog()
        setPostHogClient(posthog as unknown as PostHog)
        mockFetch(make())

        await expect(submitAndRecordProviderInterest(INPUT)).resolves.toBe(
            false,
        )

        expect(posthog.identify).not.toHaveBeenCalled()
        expect(posthog.capture).not.toHaveBeenCalled()
    })

    it('sends no PostHog ids when analytics is not running', async () => {
        const fetchMock = mockFetch(json({ ok: true }))

        await submitAndRecordProviderInterest(INPUT)

        const body = JSON.parse(fetchMock.mock.calls[0][1].body as string)
        expect(body.posthogSessionId).toBeUndefined()
        expect(body.posthogDistinctId).toBeUndefined()
    })
})
