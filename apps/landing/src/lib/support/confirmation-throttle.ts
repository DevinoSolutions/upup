// In-memory per-recipient throttle for the submitter confirmation email. The
// support form accepts any address, so without this it is a relay: anyone could
// make us mail an echo of text they chose to a third party, over and over. One
// confirmation per normalized address per window; the team notification is a
// separate leg and is never throttled. Like idempotency.ts this is per-process
// state (fine for the single-region deploy; swap the Map for a shared store to
// scale out).

/** One confirmation per address per 24 hours. */
const CONFIRMATION_WINDOW_MS = 24 * 60 * 60 * 1000

/** Hard ceiling on tracked addresses, so a flood of distinct ones cannot grow the Map without bound. */
const MAX_ENTRIES = 5_000

// address -> time of the confirmation we last mailed. Insertion order doubles
// as age order: a re-take deletes and re-sets the key, so the first key is
// always the oldest.
const sentAt = new Map<string, number>()

/**
 * The throttle key for an address: trimmed, lower-cased, with any `+tag`
 * dropped from the local part (all `+tag` variants reach one mailbox, so they
 * must share one allowance).
 */
function normalizeRecipient(email: string): string {
    const trimmed = email.trim().toLowerCase()
    const at = trimmed.lastIndexOf('@')
    if (at < 0) return trimmed
    const local = trimmed.slice(0, at)
    const plus = local.indexOf('+')
    return `${plus > 0 ? local.slice(0, plus) : local}${trimmed.slice(at)}`
}

/** Claim this address's allowance. Returns false while a confirmation was already mailed inside the window. */
export function takeConfirmationSlot(email: string): boolean {
    const key = normalizeRecipient(email)
    const now = Date.now()
    const last = sentAt.get(key)
    if (last !== undefined && now - last < CONFIRMATION_WINDOW_MS) return false

    sentAt.delete(key)
    sentAt.set(key, now)
    while (sentAt.size > MAX_ENTRIES) {
        const oldest = sentAt.keys().next().value
        if (oldest === undefined) break
        sentAt.delete(oldest)
    }
    return true
}

/** Hand the allowance back: a send that did not go out must not cost the address its confirmation. */
export function releaseConfirmationSlot(email: string): void {
    sentAt.delete(normalizeRecipient(email))
}
