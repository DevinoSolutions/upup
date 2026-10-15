import { createHash } from 'node:crypto'
import type { PostHog } from 'posthog-js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PROVIDER_NOTIFY_SIGNUP } from '@/lib/analytics/contract'
import {
    resetPostHogClientForTests,
    setPostHogClient,
} from '@/lib/analytics/posthog-client'
import {
    recordProviderNotifySignup,
    signupPersonId,
} from '@/lib/analytics/signup'

// The homepage "Notify me" form is the site's one sign-up. Its source (UTM,
// referrer, landing page) only exists in the browser, so the sign-up is
// recorded there: the visitor is identified by a hash of the address (never
// the address) and a browser event is captured, which PostHog stamps with the
// session's entry source.

const EMAIL = 'Ada.Lovelace@Example.com'
const sha256 = (value: string) =>
    createHash('sha256').update(value).digest('hex')

function fakePostHog() {
    const calls: string[] = []
    const instance = {
        identify: vi.fn((id: string) => calls.push(`identify:${id}`)),
        capture: vi.fn((name: string) => calls.push(`capture:${name}`)),
    }
    return { instance, calls }
}

const SIGNUP = {
    email: EMAIL,
    providerName: 'Vercel Blob',
    isCustom: false,
    feedbackId: '3f0e8a52-5b1c-4c39-9d5f-1f6f0f9b7c11',
}

afterEach(() => {
    resetPostHogClientForTests()
})

describe('signupPersonId', () => {
    it('is the SHA-256 of the trimmed, lower-cased address', async () => {
        expect(await signupPersonId(`  ${EMAIL} `)).toBe(
            `email-sha256:${sha256('ada.lovelace@example.com')}`,
        )
    })

    it('gives the same person for the same address in any case', async () => {
        expect(await signupPersonId('ADA.LOVELACE@EXAMPLE.COM')).toBe(
            await signupPersonId(EMAIL),
        )
    })

    it('never contains the address or its local part', async () => {
        const id = await signupPersonId(EMAIL)
        expect(id.toLowerCase()).not.toContain('lovelace')
        expect(id.toLowerCase()).not.toContain('example.com')
    })
})

describe('recordProviderNotifySignup', () => {
    it('identifies the visitor before capturing the sign-up event', async () => {
        const { instance, calls } = fakePostHog()
        setPostHogClient(instance as unknown as PostHog)

        await recordProviderNotifySignup(SIGNUP)

        const personId = await signupPersonId(EMAIL)
        expect(calls).toEqual([
            `identify:${personId}`,
            `capture:${PROVIDER_NOTIFY_SIGNUP}`,
        ])
        expect(instance.capture).toHaveBeenCalledWith(PROVIDER_NOTIFY_SIGNUP, {
            provider: 'Vercel Blob',
            is_custom_provider: false,
            feedback_id: SIGNUP.feedbackId,
        })
    })

    it('sends no property that carries the address', async () => {
        const { instance } = fakePostHog()
        setPostHogClient(instance as unknown as PostHog)

        await recordProviderNotifySignup(SIGNUP)

        const sent = JSON.stringify([
            instance.identify.mock.calls,
            instance.capture.mock.calls,
        ]).toLowerCase()
        expect(sent).not.toContain('lovelace')
        expect(sent).not.toContain('example.com')
    })

    it('waits for PostHog when the form is submitted before it has booted', async () => {
        const { instance } = fakePostHog()
        await recordProviderNotifySignup(SIGNUP)
        // Nothing registered yet: the sign-up is held, not dropped.
        expect(instance.identify).not.toHaveBeenCalled()

        setPostHogClient(instance as unknown as PostHog)

        expect(instance.identify).toHaveBeenCalledTimes(1)
        expect(instance.capture).toHaveBeenCalledWith(
            PROVIDER_NOTIFY_SIGNUP,
            expect.objectContaining({ provider: 'Vercel Blob' }),
        )
    })

    it('never throws when PostHog does', async () => {
        setPostHogClient({
            identify: () => {
                throw new Error('posthog down')
            },
            capture: vi.fn(),
        } as unknown as PostHog)

        await expect(
            recordProviderNotifySignup(SIGNUP),
        ).resolves.toBeUndefined()
    })
})
