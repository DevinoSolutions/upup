/** Identifies this app across every analytics/feedback surface. */
export const APP_ID = 'upup-landing'

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

/**
 * The site's one sign-up: a visitor left their address on the homepage
 * "Notify me" form to hear when a storage provider integration ships. The
 * support route already records the request server-side, but a server event
 * carries no browser context, so this browser-side event is the one that
 * holds the sign-up's source: PostHog stamps it with the session's entry UTM
 * parameters, referrer and landing page.
 */
export const PROVIDER_NOTIFY_SIGNUP = 'provider_notify_signup'
