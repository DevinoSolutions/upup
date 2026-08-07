'use client'

import { clientDatasetCredentials } from './dataset'

/**
 * The one browser-side PostHog capture path.
 *
 * Delivery is dataset-gated: on `disabled` this is a no-op, so a build without
 * analytics credentials never reaches for the SDK at all. posthog-js is pulled
 * in through a dynamic import so a bundle that has no other reason to include
 * it (an e2e/CI build with analytics off) does not pay for it — note that on a
 * normal page load PostHogProvider has already imported it statically from the
 * root layout, so this is a guard for the disabled case, not a bundle win on
 * production pages.
 *
 * Capture failures are swallowed on purpose: an analytics call must never break
 * the interaction that produced it.
 */
export function captureClientEvent(
    name: string,
    properties: Record<string, unknown>,
): void {
    const { dataset } = clientDatasetCredentials()
    if (dataset === 'disabled') return
    void import('posthog-js')
        .then(({ default: posthog }) => {
            posthog.capture(name, properties)
        })
        .catch(() => {})
}
