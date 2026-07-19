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
 * Deliver a support request by email when SMTP is configured. Returns
 * `not_configured` (distinct from `failed`) when SMTP_URL is absent, so the
 * route can tell "we chose not to email" from "the send broke". Never throws.
 */
export async function sendSupportEmail(
    input: SupportEmailInput,
): Promise<EmailLegStatus> {
    const smtpUrl = env.SMTP_URL
    if (!smtpUrl) return 'not_configured'

    const from = env.SUPPORT_EMAIL_FROM || DEFAULT_FROM
    const to = env.SUPPORT_EMAIL_TO || DEFAULT_TO
    const subject = `[upup support] ${input.type} — ${input.feedbackId}`

    try {
        const transport = nodemailer.createTransport(smtpUrl)
        await transport.sendMail({
            from,
            to,
            ...(input.email ? { replyTo: input.email } : {}),
            subject,
            text: buildBody(input),
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
