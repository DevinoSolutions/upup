import { captureServerEvent } from '@/lib/analytics/capture.server'
import { APP_ID, SUPPORT_REQUEST_SUBMITTED } from '@/lib/analytics/contract'
import {
    APP_VERSION,
    buildFeedbackProperties,
} from '@/lib/analytics/contract.server'
import { serverDatasetCredentials } from '@/lib/analytics/dataset.server'
import {
    releaseConfirmationSlot,
    takeConfirmationSlot,
} from '@/lib/support/confirmation-throttle'
import { sendSupportConfirmation, sendSupportEmail } from '@/lib/support/email'
import { getProcessed, rememberProcessed } from '@/lib/support/idempotency'
import { clientIpFromHeaders, takeToken } from '@/lib/support/rate-limit'
import {
    supportRequestSchema,
    toSingleLine,
    type SupportResponse,
} from '@/lib/support/schema'

// This route reads request bodies + in-memory state, so it must run on the
// Node runtime and never be statically cached.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Request bodies above this are rejected before JSON parsing (worst legitimate body is ~24 KiB: 5000-char message and 2000-char outcome at 3 bytes each, plus route/website/ids). */
const MAX_BODY_BYTES = 32 * 1024

/**
 * Read the body as JSON without ever buffering more than MAX_BODY_BYTES: trust
 * neither `content-length` (absent or lying on chunked bodies) nor the parser.
 * Returns a discriminated result instead of throwing.
 */
async function readBoundedJson(
    req: Request,
): Promise<
    | { ok: true; value: unknown }
    | { ok: false; reason: 'too-large' | 'invalid' }
> {
    const declared = Number(req.headers.get('content-length'))
    if (Number.isFinite(declared) && declared > MAX_BODY_BYTES)
        return { ok: false, reason: 'too-large' }
    if (!req.body) return { ok: false, reason: 'invalid' }
    const reader = req.body.getReader()
    const chunks: Uint8Array[] = []
    let total = 0
    for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        total += value.byteLength
        if (total > MAX_BODY_BYTES) {
            await reader.cancel().catch(() => undefined)
            return { ok: false, reason: 'too-large' }
        }
        chunks.push(value)
    }
    try {
        return {
            ok: true,
            value: JSON.parse(
                Buffer.concat(chunks.map(c => Buffer.from(c))).toString('utf8'),
            ),
        }
    } catch {
        return { ok: false, reason: 'invalid' }
    }
}

export async function POST(req: Request): Promise<Response> {
    // 1 — per-IP rate limit
    const ip = clientIpFromHeaders(req.headers)
    if (!takeToken(ip)) {
        return json(rejected(), 429, { 'retry-after': '60' })
    }

    // 2 — parse + validate against the shared schema
    const read = await readBoundedJson(req)
    if (!read.ok)
        return json(rejected(), read.reason === 'too-large' ? 413 : 400)
    const raw = read.value
    const parsed = supportRequestSchema.safeParse(raw)
    if (!parsed.success) return json(rejected(), 400)

    const data = parsed.data
    const feedbackId = data.feedbackId

    // 3 — honeypot: a filled hidden field means a bot. Return the normal
    // success shape (silent drop) and record NOTHING.
    if (data.website && data.website.length > 0) {
        return json(
            {
                ok: true,
                feedbackId,
                posthog: 'ok',
                email: 'not_configured',
                confirmation: 'skipped',
            },
            200,
        )
    }

    // Idempotency: a prior fully-handled attempt with this id replays verbatim
    // (retry-safety without re-capturing / re-sending).
    const prior = getProcessed(feedbackId)
    if (prior) return json(prior, 200)

    const { dataset, host } = serverDatasetCredentials()
    const userAgent = req.headers.get('user-agent')
    const platform = userAgent
        ? toSingleLine(userAgent).slice(0, 200)
        : undefined
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

    // 6 — confirm receipt to the submitter, only for a submission that landed
    // somewhere (never "we got it" for a request recorded nowhere). Best
    // effort: it can neither fail the request nor change `ok`.
    const confirmation = ok
        ? await confirmToSubmitter(feedbackId, data.email, data.message)
        : 'skipped'

    const body: SupportResponse = {
        ok,
        feedbackId,
        posthog,
        email,
        confirmation,
    }
    if (ok) rememberProcessed(feedbackId, body)
    return json(body, ok ? 200 : 502)
}

/**
 * Mail the submitter a confirmation, at most once per address per throttle
 * window (the form takes any address, so an unthrottled echo would be a spam
 * relay). A send that did not go out hands the allowance back. Never throws.
 */
async function confirmToSubmitter(
    feedbackId: string,
    email: string | undefined,
    message: string,
): Promise<SupportResponse['confirmation']> {
    if (!email) return 'skipped'
    if (!takeConfirmationSlot(email)) {
        console.info(`[support] confirmation throttled for ${feedbackId}`)
        return 'throttled'
    }
    try {
        const status = await sendSupportConfirmation({
            feedbackId,
            email,
            message,
        })
        if (status !== 'ok') releaseConfirmationSlot(email)
        return status
    } catch (error) {
        releaseConfirmationSlot(email)
        console.error(
            `[support] confirmation errored for ${feedbackId}: ${String(error)}`,
        )
        return 'failed'
    }
}

function rejected(): SupportResponse {
    return {
        ok: false,
        feedbackId: '',
        posthog: 'failed',
        email: 'failed',
        confirmation: 'skipped',
    }
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
