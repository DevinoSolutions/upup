/**
 * Session-replay settings for PostHog and Sentry, so the two recorders mask
 * the same way. Both tools store replays on our self-hosted servers, so the
 * session rates are kept low.
 *
 * PostHog records 1 session in 10. Its project settings hold the same 10%
 * (and limit recording to the production domain); the client value below
 * overrides the project's, so this file is where the rate is changed.
 */
export const POSTHOG_REPLAY_SAMPLE_RATE = 0.1

/**
 * Sentry records 1 session in 10, like PostHog. It ran at 5% while the
 * self-hosted relay rejected envelope bursts above 5/s; that quota is now
 * raised. Kept separate so either rate can move on its own.
 */
export const SENTRY_REPLAY_SAMPLE_RATE = 0.1

/** Sentry only: share of sessions with an error that keep their replay. */
export const REPLAY_ON_ERROR_SAMPLE_RATE = 1

/**
 * Elements whose text is masked in every replay, on top of each tool's own
 * defaults (both mask every input; Sentry also masks all text). Besides
 * `.ph-sensitive` (the class PostHog autocapture already skips) and
 * `[data-ph-mask]` (this site's marker), every uploader on the site lives
 * under `.upup-scope`, and its file list can show a visitor's own file
 * names, including the cloud-drive browser's listing after a drive sign-in.
 */
export const REPLAY_MASK_SELECTORS = [
    '.ph-sensitive',
    '[data-ph-mask]',
    '.upup-scope',
]

/**
 * Elements left out of every replay entirely (recorded as an empty box): the
 * uploader's image/video previews, camera and screen-capture feeds, and the
 * image editor's canvas show the visitor's own files.
 */
export const REPLAY_BLOCK_SELECTORS = [
    '.upup-scope img',
    '.upup-scope video',
    '.upup-scope canvas',
]
