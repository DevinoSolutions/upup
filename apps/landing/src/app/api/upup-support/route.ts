import { captureServerEvent } from '@/lib/analytics/capture.server'
import { APP_ID, SUPPORT_REQUEST_SUBMITTED } from '@/lib/analytics/contract'
import {
    APP_VERSION,
    buildFeedbackProperties,
} from '@/lib/analytics/contract.server'
import { serverDatasetCredentials } from '@/lib/analytics/dataset.server'
import { sendSupportEmail } from '@/lib/support/email'
import { getProcessed, rememberProcessed } from '@/lib/support/idempotency'
import { clientIpFromHeaders, takeToken } from '@/lib/support/rate-limit'
import {
    stripControlChars,
    supportRequestSchema,
    type SupportResponse,
} from '@/lib/support/schema'

// This route reads request bodies + in-memory state, so it must run on the
// Node runtime and never be statically cached.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Request bodies above this are rejected before JSON parsing (legit max is ~20 KiB). */
const MAX_BODY_BYTES = 32 * 1024

/**
 * Read the body as JSON without ever buffering more than MAX_BODY_BYTES: trust
 * neither `content-length` (absent or lying on chunked bodies) nor the parser.
 * Returns 'too-large' / 'invalid' instead of throwing.
 */
async function readBoundedJson(
    req: Request,
): Promise<unknown | 'too-large' | 'invalid'> {
    const declared = Number(req.headers.get('content-length'))
    if (Number.isFinite(declared) && declared > MAX_BODY_BYTES)
        return 'too-large'
    if (!req.body) return 'invalid'
    const reader = req.body.getReader()
    const chunks: Uint8Array[] = []
    let total = 0
    for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        total += value.byteLength
        if (total > MAX_BODY_BYTES) {
            await reader.cancel().catch(() => undefined)
            return 'too-large'
        }
        chunks.push(value)
    }
    try {
        return JSON.parse(
            Buffer.concat(chunks.map(c => Buffer.from(c))).toString('utf8'),
        )
    } catch {
        return 'invalid'
    }
}

export async function POST(req: Request): Promise<Response> {
    // 1 — per-IP rate limit
    const ip = clientIpFromHeaders(req.headers)
    if (!takeToken(ip)) {
        return json(
            { ok: false, feedbackId: '', posthog: 'failed', email: 'failed' },
            429,
            { 'retry-after': '60' },
        )
    }

    // 2 — parse + validate against the shared schema
    const raw = await readBoundedJson(req)
    if (raw === 'too-large') return json(rejected(), 413)
    if (raw === 'invalid') return json(rejected(), 400)
    const parsed = supportRequestSchema.safeParse(raw)
    if (!parsed.success) return json(rejected(), 400)

    const data = parsed.data
    const feedbackId = data.feedbackId

    // 3 — honeypot: a filled hidden field means a bot. Return the normal
    // success shape (silent drop) and record NOTHING.
    if (data.website && data.website.length > 0) {
        return json(
            { ok: true, feedbackId, posthog: 'ok', email: 'not_configured' },
            200,
        )
    }

    // Idempotency: a prior fully-handled attempt with this id replays verbatim
    // (retry-safety without re-capturing / re-sending).
    const prior = getProcessed(feedbackId)
    if (prior) return json(prior, 200)

    const { dataset, host } = serverDatasetCredentials()
    const userAgent = req.headers.get('user-agent')
    const platform = userAgent ? stripControlChars(userAgent) : undefined
    const route = data.route

    const properties = {
        ...buildFeedbackProperties({
            feedbackId,
            // The homepage "Notify me" modal posts here too.
            feedbackSource:
                data.type === 'provider_notify'
                    ? 'homepage_provider_notify'
                    : 'support_page',
            feedbackType: data.type,
            environment: dataset,
            platform,
            route,
            posthogSessionId: data.posthogSessionId,
            posthogDistinctId: data.posthogDistinctId,
        }),
        // The feedback itself. The submitter's EMAIL is never a property here.
        message: data.message,
        expected_outcome: data.expectedOutcome ?? '',
        wants_reply: data.wantsReply,
        has_email: Boolean(data.email),
    }
    const distinctId = data.posthogDistinctId || `anonymous:${feedbackId}`

    // 4 — the two legs run INDEPENDENTLY; one failing never blocks the other.
    // testRunId / testScenario are merged into the event ONLY on the e2e
    // dataset (captureServerEvent gates them); inert on production/disabled.
    const [phSettled, emailSettled] = await Promise.allSettled([
        captureServerEvent(SUPPORT_REQUEST_SUBMITTED, distinctId, properties, {
            testRunId: data.testRunId,
            testScenario: data.testScenario,
        }),
        sendSupportEmail({
            feedbackId,
            type: data.type,
            message: data.message,
            expectedOutcome: data.expectedOutcome,
            email: data.email,
            appId: APP_ID,
            appVersion: APP_VERSION,
            route,
            environment: dataset,
            platform,
            posthogHost: host,
            posthogSessionId: data.posthogSessionId,
            posthogDistinctId: data.posthogDistinctId,
        }),
    ])

    // A disabled dataset is a deliberate no-op, not a failure: report it as its
    // own outcome so a skipped leg is never mistaken for a broken one.
    const posthog: SupportResponse['posthog'] =
        phSettled.status === 'rejected'
            ? 'failed'
            : phSettled.value.ok
              ? 'ok'
              : phSettled.value.skipped
                ? 'skipped'
                : 'failed'
    if (posthog === 'skipped') {
        console.info(
            `[support] posthog leg skipped for ${feedbackId}: analytics disabled`,
        )
    } else if (posthog === 'failed') {
        const reason =
            phSettled.status === 'rejected'
                ? String(phSettled.reason)
                : (phSettled.value.error ?? 'unknown error')
        // No Sentry exists in this repo — this console.error is the documented
        // gap where an error tracker would capture the failure.
        console.error(
            `[support] posthog leg failed for ${feedbackId}: ${reason}`,
        )
    }

    const email: SupportResponse['email'] =
        emailSettled.status === 'fulfilled' ? emailSettled.value : 'failed'
    if (email === 'failed') {
        const reason =
            emailSettled.status === 'rejected'
                ? String(emailSettled.reason)
                : 'send failed'
        console.error(`[support] email leg failed for ${feedbackId}: ${reason}`)
    }

    // 5 — 200 when at least one leg landed; 502 when nothing was recorded.
    const ok = posthog === 'ok' || email === 'ok'
    const body: SupportResponse = { ok, feedbackId, posthog, email }
    if (ok) rememberProcessed(feedbackId, body)
    return json(body, ok ? 200 : 502)
}

function rejected(): SupportResponse {
    return { ok: false, feedbackId: '', posthog: 'failed', email: 'failed' }
}

function json(
    body: SupportResponse,
    status: number,
    extraHeaders: Record<string, string> = {},
): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json', ...extraHeaders },
    })
}
