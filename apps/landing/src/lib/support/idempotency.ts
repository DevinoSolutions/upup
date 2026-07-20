import type { SupportResponse } from './schema'

// Retry-safety without a database: remember the response of each fully-handled
// feedbackId so a client retry (same id, same payload) replays the SAME result
// instead of double-capturing/double-sending. Bounded LRU — insertion order is
// the eviction order, and a re-remember moves the key to the most-recent slot.

const MAX_ENTRIES = 500
const store = new Map<string, SupportResponse>()

export function getProcessed(feedbackId: string): SupportResponse | undefined {
    return store.get(feedbackId)
}

export function rememberProcessed(
    feedbackId: string,
    response: SupportResponse,
): void {
    if (store.has(feedbackId)) store.delete(feedbackId)
    store.set(feedbackId, response)
    while (store.size > MAX_ENTRIES) {
        const oldest = store.keys().next().value
        if (oldest === undefined) break
        store.delete(oldest)
    }
}
