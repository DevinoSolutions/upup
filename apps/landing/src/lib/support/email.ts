import nodemailer from 'nodemailer'
import { env } from '@/lib/env'
import type { EmailLegStatus, SupportType } from './schema'

// Placeholder defaults — a real deploy sets SUPPORT_EMAIL_FROM / _TO.
const DEFAULT_FROM = 'upup-support@useupup.com'
const DEFAULT_TO = 'hello@devino.ca'

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
 * Deliver a support request by email. Two transports are supported, tried in
 * order: the UseSend REST API (USESEND_API_URL + USESEND_API_KEY) — preferred,
 * because a self-hosted UseSend is HTTP-only behind a CDN with no reachable
 * SMTP endpoint — then a generic SMTP_URL. Returns `not_configured` (distinct
 * from `failed`) when NEITHER is set, so the route can tell "we chose not to
 * email" from "the send broke". Never throws.
 */
export async function sendSupportEmail(
    input: SupportEmailInput,
): Promise<EmailLegStatus> {
    const from = env.SUPPORT_EMAIL_FROM || DEFAULT_FROM
    const to = env.SUPPORT_EMAIL_TO || DEFAULT_TO
    const subject = `[upup support] ${input.type} — ${input.feedbackId}`
    const text = buildBody(input)

    if (env.USESEND_API_URL && env.USESEND_API_KEY) {
        return sendViaUseSend({
            apiUrl: env.USESEND_API_URL,
            apiKey: env.USESEND_API_KEY,
            from,
            to,
            subject,
            text,
            replyTo: input.email,
            feedbackId: input.feedbackId,
        })
    }

    const smtpUrl = env.SMTP_URL
    if (!smtpUrl) return 'not_configured'

    try {
        const transport = nodemailer.createTransport(smtpUrl)
        await transport.sendMail({
            from,
            to,
            ...(input.email ? { replyTo: input.email } : {}),
            subject,
            text,
        })
        return 'ok'
    } catch (error) {
        console.error(
            `[support] email send failed for ${input.feedbackId}:`,
            error instanceof Error ? error.message : error,
        )
        return 'failed'
    }
}

/**
 * Send through the UseSend REST API (Resend-compatible `POST /api/v1/emails`).
 * A self-hosted UseSend validates the Bearer key against its own DB, so this is
 * the correct transport for a CDN-fronted, HTTP-only deployment where the SMTP
 * proxy is not routable. Never throws — maps every outcome to a leg status.
 */
async function sendViaUseSend(msg: {
    apiUrl: string
    apiKey: string
    from: string
    to: string
    subject: string
    text: string
    replyTo?: string
    feedbackId: string
}): Promise<EmailLegStatus> {
    const endpoint = `${msg.apiUrl.replace(/\/+$/, '')}/api/v1/emails`
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
                authorization: `Bearer ${msg.apiKey}`,
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                from: msg.from,
                to: msg.to,
                subject: msg.subject,
                text: msg.text,
                ...(msg.replyTo ? { replyTo: msg.replyTo } : {}),
            }),
            signal: controller.signal,
        })
        if (!res.ok) {
            const detail = await res.text().catch(() => '')
            console.error(
                `[support] usesend send failed for ${msg.feedbackId}: ${res.status} ${detail.slice(0, 300)}`,
            )
            return 'failed'
        }
        return 'ok'
    } catch (error) {
        console.error(
            `[support] usesend send errored for ${msg.feedbackId}:`,
            error instanceof Error ? error.message : error,
        )
        return 'failed'
    } finally {
        clearTimeout(timeout)
    }
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
