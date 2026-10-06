import pkg from '../../../package.json'

/** Identifies this app across every analytics/feedback surface. */
export const APP_ID = 'upup-landing'

/** Landing package version — travels with every server-captured event. */
export const APP_VERSION: string = pkg.version

/** Canonical event name for a submitted support request. */
export const SUPPORT_REQUEST_SUBMITTED = 'support_request_submitted'

/**
 * The hero install box's copy button was pressed: the site's main conversion.
 * Autocapture only saw an unlabeled icon click, so this names it and carries
 * the chosen package manager.
 */
export const INSTALL_COMMAND_COPIED = 'install_command_copied'

/**
 * The live demos' upload funnel: a visitor pressed Upload, then the run ended
 * in success or failure. Before these, a demo upload left no trace beyond an
 * unlabeled autocapture click, so demo success and failure were unmeasurable.
 */
export const DEMO_UPLOAD_STARTED = 'demo_upload_started'
export const DEMO_UPLOAD_SUCCEEDED = 'demo_upload_succeeded'
export const DEMO_UPLOAD_FAILED = 'demo_upload_failed'

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
