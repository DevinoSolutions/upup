import type { PostHog } from 'posthog-js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PROVIDER_NOTIFY_SIGNUP } from '@/lib/analytics/contract'
import {
    resetPostHogClientForTests,
    setPostHogClient,
} from '@/lib/analytics/posthog-client'
import {
    PROVIDER_MAX_LENGTH,
    recordProviderNotifySignup,
    signupPersonId,
} from '@/lib/analytics/signup'

// The homepage "Notify me" form is the site's one sign-up. Its source (UTM,
// referrer, landing page) only exists in the browser, so the sign-up is
// recorded there: the visitor is identified by an id derived from the
// submission's random feedbackId (no email, hashed or otherwise, ever reaches
// PostHog) and a browser event is captured, which PostHog stamps with the
// session's entry source.

const SIGNUP = {
    providerName: 'Vercel Blob',
    isCustom: false,
    feedbackId: '3f0e8a52-5b1c-4c39-9d5f-1f6f0f9b7c11',
}

function fakePostHog(userState: 'anonymous' | 'identified' | undefined) {
    const calls: string[] = []
    const instance = {
        // Mirrors the public typed accessor posthog-js persists identity under.
        get_property: vi.fn((name: string) =>
            name === '$user_state' ? userState : undefined,
        ),
        identify: vi.fn((id: string) => calls.push(`identify:${id}`)),
        capture: vi.fn((name: string, _props?: Record<string, unknown>) =>
            calls.push(`capture:${name}`),
        ),
        reset: vi.fn(),
    }
    return { instance, calls }
}

afterEach(() => {
    resetPostHogClientForTests()
})

describe('signupPersonId', () => {
    it('is signup:<feedbackId>', () => {
        expect(signupPersonId(SIGNUP.feedbackId)).toBe(
            `signup:${SIGNUP.feedbackId}`,
        )
    })
})

describe('recordProviderNotifySignup', () => {
    it('identifies an anonymous visitor as signup:<feedbackId> before capturing', () => {
        const { instance, calls } = fakePostHog('anonymous')
        setPostHogClient(instance as unknown as PostHog)

        recordProviderNotifySignup(SIGNUP)

        expect(calls).toEqual([
            `identify:signup:${SIGNUP.feedbackId}`,
            `capture:${PROVIDER_NOTIFY_SIGNUP}`,
        ])
        expect(instance.capture).toHaveBeenCalledWith(PROVIDER_NOTIFY_SIGNUP, {
            provider: 'Vercel Blob',
            is_custom_provider: false,
            feedback_id: SIGNUP.feedbackId,
        })
    })

    it('identifies a visitor whose identity state was never set', () => {
        const { instance } = fakePostHog(undefined)
        setPostHogClient(instance as unknown as PostHog)

        recordProviderNotifySignup(SIGNUP)

        expect(instance.identify).toHaveBeenCalledTimes(1)
    })

    it('captures under the existing person, without identify or reset, when already identified', () => {
        const { instance, calls } = fakePostHog('identified')
        setPostHogClient(instance as unknown as PostHog)

        recordProviderNotifySignup(SIGNUP)

        expect(instance.identify).not.toHaveBeenCalled()
        expect(instance.reset).not.toHaveBeenCalled()
        expect(calls).toEqual([`capture:${PROVIDER_NOTIFY_SIGNUP}`])
    })

    it('caps a visitor-typed custom provider name', () => {
        const { instance } = fakePostHog('anonymous')
        setPostHogClient(instance as unknown as PostHog)

        recordProviderNotifySignup({
            ...SIGNUP,
            providerName: 'x'.repeat(500),
            isCustom: true,
        })

        const props = instance.capture.mock.calls[0][1] as unknown as {
            provider: string
        }
        expect(props.provider).toBe('x'.repeat(PROVIDER_MAX_LENGTH))
        expect(PROVIDER_MAX_LENGTH).toBe(80)
    })

    it('waits for PostHog when the form is submitted before it has booted', () => {
        const { instance } = fakePostHog('anonymous')
        recordProviderNotifySignup(SIGNUP)
        // Nothing registered yet: the sign-up is held, not dropped.
        expect(instance.identify).not.toHaveBeenCalled()

        setPostHogClient(instance as unknown as PostHog)

        expect(instance.identify).toHaveBeenCalledTimes(1)
        expect(instance.capture).toHaveBeenCalledWith(
            PROVIDER_NOTIFY_SIGNUP,
            expect.objectContaining({ provider: 'Vercel Blob' }),
        )
    })

    it('never throws when PostHog does', () => {
        setPostHogClient({
            get_property: () => 'anonymous',
            identify: () => {
                throw new Error('posthog down')
            },
            capture: vi.fn(),
        } as unknown as PostHog)

        expect(() => recordProviderNotifySignup(SIGNUP)).not.toThrow()
    })
})
