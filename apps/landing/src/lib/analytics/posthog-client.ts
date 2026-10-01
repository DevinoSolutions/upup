import type { PostHog } from 'posthog-js'

/**
 * The live PostHog instance, once the provider has initialised it.
 *
 * Only a TYPE import of posthog-js lives here, so importing this module never
 * pulls the SDK into a bundle. The provider loads the SDK with a dynamic
 * import, calls `init()`, then registers the instance through
 * `setPostHogClient()`.
 *
 * posthog-js silently DROPS a `capture()` made before `init()` has run. On the
 * marketing landing routes the provider boots after the page has loaded (see
 * posthog-provider.tsx), so anything captured earlier is held here instead:
 * up to PENDING_LIMIT events, each stamped with the time it actually happened,
 * then replayed in order the moment the instance registers.
 */

interface PendingCapture {
    name: string
    properties: Record<string, unknown>
    timestamp: Date
}

/** Hard cap on events held before PostHog is ready; later ones are dropped. */
export const PENDING_LIMIT = 50

let client: PostHog | null = null
let pending: PendingCapture[] = []
let readyListeners: Array<(instance: PostHog) => void> = []

/** Called by the provider right after `posthog.init()`. */
export function setPostHogClient(instance: PostHog): void {
    client = instance
    const queued = pending
    pending = []
    for (const event of queued) {
        try {
            instance.capture(event.name, event.properties, {
                timestamp: event.timestamp,
            })
        } catch {
            // An analytics call must never break the page.
        }
    }
    const listeners = readyListeners
    readyListeners = []
    for (const listener of listeners) {
        try {
            listener(instance)
        } catch {
            // A consumer's callback must not stop the others.
        }
    }
}

/** The live instance, or null while PostHog is still loading / disabled. */
export function getPostHogClient(): PostHog | null {
    return client
}

/**
 * Send an event now if PostHog is ready, else queue it (with its original
 * timestamp) until it is. Callers gate on the analytics dataset first — a
 * disabled build never calls this, so nothing queues forever there.
 */
export function capturePostHog(
    name: string,
    properties: Record<string, unknown>,
): void {
    if (client) {
        try {
            client.capture(name, properties)
        } catch {
            // Swallowed on purpose: see above.
        }
        return
    }
    if (pending.length >= PENDING_LIMIT) return
    pending.push({ name, properties, timestamp: new Date() })
}

/**
 * Run `listener` with the live instance: immediately when PostHog is already
 * up, otherwise once it registers. Returns an unsubscribe for effects.
 */
export function whenPostHogReady(
    listener: (instance: PostHog) => void,
): () => void {
    if (client) {
        listener(client)
        return () => {}
    }
    readyListeners.push(listener)
    return () => {
        readyListeners = readyListeners.filter(l => l !== listener)
    }
}

/** Test-only: forget the instance, the queue and the listeners. */
export function resetPostHogClientForTests(): void {
    client = null
    pending = []
    readyListeners = []
}
