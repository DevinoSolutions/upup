type Context = { req: { url: string } }
type Next = () => Promise<void>
type MaybeResponse = Response | void
import { env } from '../../lib/env.js'

/**
 * Daily request budget — protects against runaway LLM spend.
 *
 * We use a request count rather than a dollar cost cap because:
 *   1. Counting requests is exact; estimating dollars requires per-token
 *      pricing tables that drift as providers change SKUs.
 *   2. The agent runs Haiku 4.5 with capped output; mean cost per turn is
 *      stable. A request cap is a reasonable proxy for a dollar cap.
 *
 * If the count exceeds DAILY_REQUEST_CAP we return 503 with a friendly
 * message. Counter resets at UTC midnight.
 *
 * In-memory only — same pattern as rate-limit.ts; swap for KV/Redis when
 * deploying multi-region.
 */

const CAP = env.DAILY_REQUEST_CAP

let dayKey = utcDayKey(Date.now())
let count = 0

function utcDayKey(ms: number): string {
    const d = new Date(ms)
    return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`
}

function tick() {
    const today = utcDayKey(Date.now())
    if (today !== dayKey) {
        dayKey = today
        count = 0
    }
    count += 1
}

export function dailyBudgetMiddleware() {
    return async (c: Context, next: Next) => {
        // Skip the health probe.
        const path = new URL(c.req.url).pathname
        if (path === '/healthz') return next()

        if (count >= CAP) {
            return new Response(
                JSON.stringify({
                    error: 'Daily request budget reached. The AI assistant is taking a break.',
                }),
                { status: 503, headers: { 'content-type': 'application/json' } },
            )
        }
        tick()
        await next()
    }
}

/** Test/observability hook — peek at the budget without bumping it. */
export function dailyBudgetSnapshot() {
    return { dayKey, count, cap: CAP }
}
