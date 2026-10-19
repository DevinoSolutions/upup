import { PROVIDER_NOTIFY_SIGNUP } from './contract'
import { whenPostHogReady } from './posthog-client'

/** `provider` is visitor-typed for a custom provider: cap what we ship. */
export const PROVIDER_MAX_LENGTH = 80

/**
 * The PostHog person id for a sign-up, derived from the submission's random
 * `feedbackId` UUID. It carries nothing about the visitor, so no email (or
 * anything derived from one) ever reaches PostHog. Identifying with it is what
 * turns the visit's first-touch source ($initial_utm_source,
 * $initial_referrer, $initial_current_url) into properties of that person.
 */
export function signupPersonId(feedbackId: string): string {
    return `signup:${feedbackId}`
}

/**
 * Whether the visitor already has an identified person. Uses the public,
 * typed `get_property('$user_state')` (the value posthog-js itself keeps in
 * persistence; its private `_isIdentified()` reads the same key). Anything
 * other than 'identified' (including an unset value) means anonymous.
 */
function isIdentified(posthog: {
    get_property: (name: string) => unknown
}): boolean {
    return posthog.get_property('$user_state') === 'identified'
}

/**
 * Record a completed homepage "Notify me" sign-up: identify the visitor (only
 * when still anonymous), then capture PROVIDER_NOTIFY_SIGNUP in the browser so
 * PostHog attaches the session's entry source to it. Runs once PostHog is up
 * (on a build with analytics disabled it never runs); analytics failures never
 * surface.
 *
 * An already-identified visitor is the same human on the same browser: the
 * event is captured under their existing person and neither identify() nor
 * reset() is called (reset would drop the session's attribution).
 */
export function recordProviderNotifySignup(input: {
    providerName: string
    isCustom: boolean
    feedbackId: string
}): void {
    whenPostHogReady(posthog => {
        try {
            if (!isIdentified(posthog)) {
                posthog.identify(signupPersonId(input.feedbackId))
            }
            posthog.capture(PROVIDER_NOTIFY_SIGNUP, {
                provider: input.providerName.slice(0, PROVIDER_MAX_LENGTH),
                is_custom_provider: input.isCustom,
                feedback_id: input.feedbackId,
            })
        } catch {
            // An analytics call must never break the page.
        }
    })
}
