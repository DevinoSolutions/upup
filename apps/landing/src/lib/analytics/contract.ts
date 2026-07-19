import pkg from '../../../package.json'

/** Identifies this app across every analytics/feedback surface. */
export const APP_ID = 'upup-landing'

/** Landing package version — travels with every server-captured event. */
export const APP_VERSION: string = pkg.version

/** Canonical event name for a submitted support request. */
export const SUPPORT_REQUEST_SUBMITTED = 'support_request_submitted'

export interface FeedbackPropertyInput {
    feedbackId: string
    feedbackSource: string
    feedbackType: string
    environment: string
    platform?: string
    route?: string
    posthogSessionId?: string
    posthogDistinctId?: string
}

/**
 * Assemble the shared feedback property set. Absent optional keys are omitted
 * rather than sent as empty/undefined. There is intentionally no `user_id` /
 * `workspace_id` (the site has no auth) and no `sentry_event_id` (no Sentry).
 * The submitter's email is NEVER a property here — it travels only on the
 * email leg.
 */
export function buildFeedbackProperties(
    input: FeedbackPropertyInput,
): Record<string, string> {
    const props: Record<string, string> = {
        feedback_id: input.feedbackId,
        feedback_source: input.feedbackSource,
        feedback_type: input.feedbackType,
        app_id: APP_ID,
        app_version: APP_VERSION,
        environment: input.environment,
    }
    if (input.platform) props.platform = input.platform
    if (input.route) props.route = input.route
    if (input.posthogSessionId)
        props.posthog_session_id = input.posthogSessionId
    if (input.posthogDistinctId)
        props.posthog_distinct_id = input.posthogDistinctId
    return props
}
