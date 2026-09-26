'use client'

import { clientDatasetCredentials } from './dataset'
import { capturePostHog } from './posthog-client'

/**
 * The one browser-side PostHog capture path.
 *
 * Delivery is dataset-gated: on `disabled` this is a no-op, so a build without
 * analytics credentials never reaches for the SDK at all. Otherwise the event
 * goes to the live PostHog instance, or — while the SDK is still loading (the
 * landing routes boot it after page load) — into a bounded queue that replays
 * in order, with each event's original timestamp, once PostHog is up. Nothing
 * here imports posthog-js itself.
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
    capturePostHog(name, properties)
}
