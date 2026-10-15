/**
 * Session-replay settings shared by PostHog and Sentry, so the two recorders
 * sample and mask the same way.
 *
 * Both tools store replays on our self-hosted servers, so the session rate is
 * kept low (1 in 10). Sentry also keeps every session that hits an error,
 * which is the replay that actually explains a bug. PostHog's project settings
 * hold the same 10% (and limit recording to the production domain); this
 * copy pins it in code so a dashboard change cannot silently raise it.
 */
export const REPLAY_SESSION_SAMPLE_RATE = 0.1

/** Sentry only: share of sessions with an error that keep their replay. */
export const REPLAY_ON_ERROR_SAMPLE_RATE = 1

/**
 * Elements whose text is masked in every replay, on top of each tool's own
 * defaults (all inputs are masked by both). `.ph-sensitive` is the class
 * PostHog autocapture already skips; `[data-ph-mask]` is this site's own
 * marker.
 */
export const REPLAY_MASK_SELECTORS = ['.ph-sensitive', '[data-ph-mask]']
