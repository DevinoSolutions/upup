import { recordProviderNotifySignup } from '@/lib/analytics/signup'
import { getPostHogClient } from '@/lib/analytics/posthog-client'

export interface ProviderInterestInput {
    email: string
    providerName: string
    isCustom: boolean
    feedbackId: string
    website: string
}

/**
 * Record provider interest through the SAME sink the support page uses: the
 * validated /api/upup-support route, which captures an analytics event and
 * emails the request. The modal has no free-text field, so it composes the
 * message itself and sends the visitor's address as the reply-to.
 *
 * The address is NEVER passed to Google Analytics or to PostHog's browser SDK;
 * it only goes to this route. `website` is the honeypot the route reads to drop
 * bots. The visitor's PostHog ids ride along (as on the support form) so the
 * server-side event joins the visitor's own session instead of an anonymous
 * one-off id.
 */
export async function submitProviderInterest(
    input: ProviderInterestInput,
): Promise<boolean> {
    const message = input.isCustom
        ? `Custom storage provider requested from the homepage: ${input.providerName}.`
        : `Notify-me request from the homepage for the ${input.providerName} integration.`
    const posthog = getPostHogClient()
    try {
        // next.config sets trailingSlash:true, so the bare path would 308 the
        // POST — hit the canonical URL (same rule as SupportForm).
        const res = await fetch('/api/upup-support/', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                type: 'provider_notify',
                message,
                wantsReply: true,
                email: input.email,
                feedbackId: input.feedbackId,
                route:
                    typeof window !== 'undefined'
                        ? window.location.pathname
                        : undefined,
                website: input.website,
                posthogSessionId: posthog?.get_session_id() || undefined,
                posthogDistinctId: posthog?.get_distinct_id() || undefined,
            }),
        })
        const body = (await res.json().catch(() => null)) as {
            ok?: boolean
        } | null
        return res.ok && body?.ok === true
    } catch {
        return false
    }
}

/**
 * The modal's post-submit flow: call the route, and only on a confirmed
 * server success record the sign-up (with its browser-side source) in
 * PostHog. A filled honeypot also gets `ok` back (the route drops it
 * silently), so it is never recorded as a sign-up. Returns whether the server
 * accepted the request.
 */
export async function submitAndRecordProviderInterest(
    input: ProviderInterestInput,
): Promise<boolean> {
    const ok = await submitProviderInterest(input)
    if (ok && !input.website) {
        recordProviderNotifySignup({
            providerName: input.providerName,
            isCustom: input.isCustom,
            feedbackId: input.feedbackId,
        })
    }
    return ok
}
