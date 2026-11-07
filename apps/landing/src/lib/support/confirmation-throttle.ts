// In-memory abuse guards for the submitter confirmation email. The support form
// accepts any address, so an unguarded confirmation is a relay: anyone could
// make us mail text they chose (even a short excerpt of it) to a third party.
// Three independent limits, none of which touches the team notification:
//
//   1. per recipient  - one confirmation per normalized address per 24 hours;
//   2. per client IP  - at most 2 confirmations per hour;
//   3. global         - at most 200 confirmations per process per UTC day.
//
// (2) and (3) are the PRIMARY guard: they cap what any one client, or all
// clients together, can make us send no matter how many distinct addresses
// they invent. (1) stops one inbox from being hammered. Its map is bounded
// (MAX_ENTRIES) and evicts the oldest address when full, so an attacker who
// floods distinct addresses could get an old one mailed a second time inside
// 24h; the budgets above are what bound that, so the Map needs no shared store.
//
// Like idempotency.ts this is per-process state (fine for the single-region
// deploy); swap the Maps for a shared store to scale out.

/** One confirmation per address per 24 hours. */
const RECIPIENT_WINDOW_MS = 24 * 60 * 60 * 1000
/** Hard ceiling on tracked addresses, so a flood of distinct ones cannot grow the Map without bound. */
export const CONFIRMATION_MAX_TRACKED_ADDRESSES = 5_000

/** At most this many confirmations per client IP per hour. */
const PER_IP_LIMIT = 2
const IP_WINDOW_MS = 60 * 60 * 1000
/** Hard ceiling on tracked IPs (same reasoning as the address cap). */
const MAX_TRACKED_IPS = 10_000
/** How often IPs whose hour has passed are swept out (also swept when the cap is hit). */
const IP_SWEEP_INTERVAL_MS = 60 * 1000

/** At most this many confirmations per process per UTC day. */
export const CONFIRMATIONS_PER_DAY = 200

// address -> time of the confirmation we last mailed. Insertion order doubles
// as age order: a re-take deletes and re-sets the key, so the first key is
// always the oldest.
const sentAt = new Map<string, number>()
// ip -> times (ms) of the confirmations it triggered inside the last hour.
const byIp = new Map<string, number[]>()
let lastIpSweepAt = 0
let today = { day: '', count: 0 }

const GMAIL_DOMAINS = new Set(['gmail.com', 'googlemail.com'])

/**
 * The throttle key for an address (already trimmed and syntactically validated
 * by the request schema): lower-cased, with any `+tag` dropped from the local
 * part, since all `+tag` variants reach one mailbox. Gmail additionally ignores
 * dots in the local part and treats googlemail.com as gmail.com, so those fold
 * into one allowance as well.
 */
function normalizeRecipient(email: string): string {
    const lower = email.toLowerCase()
    const at = lower.lastIndexOf('@')
    if (at < 0) return lower
    let local = lower.slice(0, at)
    let domain = lower.slice(at + 1)
    const plus = local.indexOf('+')
    if (plus > 0) local = local.slice(0, plus)
    if (GMAIL_DOMAINS.has(domain)) {
        local = local.replaceAll('.', '')
        domain = 'gmail.com'
    }
    return `${local}@${domain}`
}

/** Claim this address's allowance. Returns false while a confirmation was already mailed inside the window. */
export function takeConfirmationSlot(email: string): boolean {
    const key = normalizeRecipient(email)
    const now = Date.now()
    const last = sentAt.get(key)
    if (last !== undefined && now - last < RECIPIENT_WINDOW_MS) return false

    sentAt.delete(key)
    sentAt.set(key, now)
    while (sentAt.size > CONFIRMATION_MAX_TRACKED_ADDRESSES) {
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

function utcDay(now: number): string {
    return new Date(now).toISOString().slice(0, 10)
}

/**
 * Drop every IP whose newest confirmation is older than the window: it is
 * indistinguishable from an IP never seen, so forgetting it changes no decision.
 * Timestamps are appended in order, so the last one is the newest.
 */
function sweepStaleIps(now: number): void {
    lastIpSweepAt = now
    for (const [ip, times] of byIp) {
        const newest = times[times.length - 1]
        if (newest === undefined || now - newest >= IP_WINDOW_MS) {
            byIp.delete(ip)
        }
    }
}

/** Test-only: number of IPs currently tracked. */
export function trackedIpCountForTests(): number {
    return byIp.size
}

/**
 * Claim one confirmation from this client IP's hourly budget AND the process's
 * daily cap. A request the IP budget refuses never spends the daily cap.
 */
export function takeConfirmationBudget(ip: string): boolean {
    const now = Date.now()
    if (now - lastIpSweepAt >= IP_SWEEP_INTERVAL_MS) sweepStaleIps(now)
    const recent = (byIp.get(ip) ?? []).filter(t => now - t < IP_WINDOW_MS)
    if (recent.length >= PER_IP_LIMIT) {
        byIp.delete(ip)
        byIp.set(ip, recent)
        return false
    }

    const day = utcDay(now)
    if (today.day !== day) today = { day, count: 0 }
    if (today.count >= CONFIRMATIONS_PER_DAY) return false

    recent.push(now)
    byIp.delete(ip)
    byIp.set(ip, recent)
    // Over the cap: expired IPs go first; only then the oldest live one.
    if (byIp.size > MAX_TRACKED_IPS) sweepStaleIps(now)
    while (byIp.size > MAX_TRACKED_IPS) {
        const oldest = byIp.keys().next().value
        if (oldest === undefined) break
        byIp.delete(oldest)
    }
    today.count += 1
    return true
}

/**
 * Hand one confirmation of budget back (the matching send did not go out).
 * Refunds the IP's newest confirmation, and the daily cap only when that
 * confirmation was taken on the CURRENT UTC day: after midnight the counter
 * belongs to a new day, and decrementing it would refund against the wrong one.
 * An IP with no record has nothing to give back.
 */
export function releaseConfirmationBudget(ip: string): void {
    const times = byIp.get(ip)
    const takenAt = times?.pop()
    if (times && times.length === 0) byIp.delete(ip)
    if (
        takenAt !== undefined &&
        utcDay(takenAt) === today.day &&
        today.count > 0
    ) {
        today.count -= 1
    }
}
