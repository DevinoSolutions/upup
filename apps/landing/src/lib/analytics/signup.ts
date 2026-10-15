import { PROVIDER_NOTIFY_SIGNUP } from './contract'
import { whenPostHogReady } from './posthog-client'

/**
 * The PostHog person id for a sign-up: a SHA-256 of the normalised address,
 * never the address itself (no email is ever sent to PostHog). The same
 * address always maps to the same person, so a visitor who signs up twice is
 * one person, and identifying them is what turns the visit's first-touch
 * source ($initial_utm_source, $initial_referrer, $initial_current_url) into
 * properties of that person.
 */
export async function signupPersonId(email: string): Promise<string> {
    const bytes = new TextEncoder().encode(email.trim().toLowerCase())
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))
    const hex = Array.from(digest, byte =>
        byte.toString(16).padStart(2, '0'),
    ).join('')
    return `email-sha256:${hex}`
}

/**
 * Record a completed homepage "Notify me" sign-up: identify the visitor, then
 * capture PROVIDER_NOTIFY_SIGNUP in the browser so PostHog attaches the
 * session's entry source to it. Runs once PostHog is up (on a build with
 * analytics disabled it never runs); analytics failures never surface.
 */
export async function recordProviderNotifySignup(input: {
    email: string
    providerName: string
    isCustom: boolean
    feedbackId: string
}): Promise<void> {
    let personId: string
    try {
        personId = await signupPersonId(input.email)
    } catch {
        return // no SubtleCrypto (insecure context): skip, never break the form
    }
    whenPostHogReady(posthog => {
        try {
            posthog.identify(personId)
            posthog.capture(PROVIDER_NOTIFY_SIGNUP, {
                provider: input.providerName,
                is_custom_provider: input.isCustom,
                feedback_id: input.feedbackId,
            })
        } catch {
            // An analytics call must never break the page.
        }
    })
}
