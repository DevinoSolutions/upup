import { env } from '@/lib/env'
import { SUPPORT_CONFIRMATION_REPLY_LINE } from './reply-time'
import type { EmailLegStatus, SupportType } from './schema'

// Placeholder defaults — a real deploy sets SUPPORT_EMAIL_FROM / _TO.
const DEFAULT_FROM = 'upup-support@useupup.com'
const DEFAULT_TO = 'hello@devino.ca'

// Sendly's REST API origin. `POST /api/v1/emails` sends ONE transactional email
// and answers 202 `{ id, status, to, from }`. Not env-configurable on purpose:
// there is a single hosted API, and tests mock `fetch`.
const SENDLY_ENDPOINT = 'https://api.sendly.now/api/v1/emails'

/** Longest slice of the submitter's own message echoed back in the confirmation. */
const CONFIRMATION_ECHO_MAX_CHARS = 2000

export interface SupportEmailInput {
    feedbackId: string
    type: SupportType
    message: string
    expectedOutcome?: string
    /** Submitter email — used ONLY as Reply-To, never as the sender. */
    email?: string
    appId: string
    appVersion: string
    route?: string
    environment: string
    platform?: string
    posthogHost?: string
    posthogSessionId?: string
    posthogDistinctId?: string
}

/**
 * Deliver a support request by email through Sendly (the one transport — every
 * Devino app mails through Sendly). Returns `not_configured` (distinct from
 * `failed`) when SENDLY_API_KEY is unset, so the route can tell "we chose not
 * to email" from "the send broke". Never throws, and never logs the key.
 */
export async function sendSupportEmail(
    input: SupportEmailInput,
): Promise<EmailLegStatus> {
    const apiKey = env.SENDLY_API_KEY
    if (!apiKey) return 'not_configured'

    return postToSendly({
        apiKey,
        feedbackId: input.feedbackId,
        idempotencyKey: input.feedbackId,
        payload: {
            from: env.SUPPORT_EMAIL_FROM || DEFAULT_FROM,
            to: env.SUPPORT_EMAIL_TO || DEFAULT_TO,
            subject: `[upup support] ${input.type} — ${input.feedbackId}`,
            body: toHtml(buildBody(input)),
            ...(input.email ? { reply: input.email } : {}),
        },
    })
}

interface SupportConfirmationInput {
    feedbackId: string
    /** The submitter's address — the confirmation's only recipient. */
    email: string
    /** The submitter's own message, echoed back (truncated). */
    message: string
}

/**
 * Confirm receipt to the submitter, through the same Sendly transport as the
 * team notification. Plain text in the same escaped wrapper (no marketing
 * HTML). Replies go to the team inbox. A distinct idempotency key keeps a retry
 * of the same submission from mailing the submitter twice without colliding with
 * the notification's key. Never throws, never logs the key or the address.
 */
export async function sendSupportConfirmation(
    input: SupportConfirmationInput,
): Promise<EmailLegStatus> {
    const apiKey = env.SENDLY_API_KEY
    if (!apiKey) return 'not_configured'

    return postToSendly({
        apiKey,
        feedbackId: input.feedbackId,
        idempotencyKey: `${input.feedbackId}:confirm`,
        payload: {
            from: env.SUPPORT_EMAIL_FROM || DEFAULT_FROM,
            to: input.email,
            subject: `[upup support] We got your message — ${input.feedbackId}`,
            body: toHtml(buildConfirmationBody(input)),
            reply: env.SUPPORT_EMAIL_TO || DEFAULT_TO,
        },
    })
}

/** One Sendly send. Maps every outcome to a status; never throws, never logs the key. */
async function postToSendly(args: {
    apiKey: string
    feedbackId: string
    idempotencyKey: string
    payload: Record<string, string>
}): Promise<EmailLegStatus> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    try {
        const res = await fetch(SENDLY_ENDPOINT, {
            method: 'POST',
            headers: {
                authorization: `Bearer ${args.apiKey}`,
                'content-type': 'application/json',
                // A retry of the same submission replays the first receipt
                // instead of mailing twice (Sendly keeps keys for 24h).
                'idempotency-key': args.idempotencyKey,
            },
            body: JSON.stringify(args.payload),
            signal: controller.signal,
        })
        if (!res.ok) {
            const detail = await res.text().catch(() => '')
            console.error(
                `[support] sendly send failed for ${args.feedbackId}: ${res.status} ${detail.slice(0, 300)}`,
            )
            return 'failed'
        }
        return 'ok'
    } catch (error) {
        console.error(
            `[support] sendly send errored for ${args.feedbackId}:`,
            error instanceof Error ? error.message : error,
        )
        return 'failed'
    } finally {
        clearTimeout(timeout)
    }
}

function buildConfirmationBody(input: SupportConfirmationInput): string {
    return [
        'Thanks for contacting upup support, we got your message.',
        '',
        `Feedback ID: ${input.feedbackId}`,
        '',
        'Here is what you sent us:',
        truncateEcho(input.message),
        '',
        SUPPORT_CONFIRMATION_REPLY_LINE,
    ].join('\n')
}

/** Cap the echoed message by code point (never splitting a surrogate pair), marking the cut with an ellipsis. */
function truncateEcho(message: string): string {
    const chars = Array.from(message)
    return chars.length > CONFIRMATION_ECHO_MAX_CHARS
        ? `${chars.slice(0, CONFIRMATION_ECHO_MAX_CHARS).join('')}…`
        : message
}

function buildBody(input: SupportEmailInput): string {
    return [
        `Feedback ID: ${input.feedbackId}`,
        `Type: ${input.type}`,
        '',
        'Message:',
        input.message,
        '',
        'Expected outcome:',
        input.expectedOutcome || '(none provided)',
        '',
        `App: ${input.appId} @ ${input.appVersion}`,
        `Environment: ${input.environment}`,
        `Route: ${input.route || '(unknown)'}`,
        `Platform: ${input.platform || '(unknown)'}`,
        `PostHog session: ${input.posthogSessionId || '(none)'}`,
        `PostHog distinct id: ${input.posthogDistinctId || '(none)'}`,
        '',
        `Investigate in PostHog: ${input.posthogHost || '(host not configured)'} — filter events by the feedback_id above. No keys are included in this message.`,
    ].join('\n')
}

/**
 * Sendly's `body` is an HTML template, not plain text: it is rendered through
 * Sendly's template engine, where `{{...}}` is markup (a malformed block fails
 * the whole send). The submission is untrusted, so escape HTML and encode `{`/`}`
 * as entities (they still display as braces) so user text can never be parsed as
 * template syntax or injected as markup; newlines become `<br>`.
 */
function toHtml(text: string): string {
    const escaped = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/\{/g, '&#123;')
        .replace(/\}/g, '&#125;')
        .replace(/\r?\n/g, '<br>\n')
    return `<div style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.5">${escaped}</div>`
}
