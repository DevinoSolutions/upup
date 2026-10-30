import type { SupportResponse } from './schema'
import { SUPPORT_SUCCESS_REPLY_TEXT, SUPPORT_SUCCESS_TEXT } from './reply-time'

interface SuccessNotice {
    text: string
    /** Shown as a separate heads-up beside the success notice. */
    warning?: string
}

/**
 * What the form tells the visitor after a 200. The reply-time promise is made
 * only when a reply was asked for AND the server did not report the email leg
 * as failed: a failed leg means the team may never see the request in their
 * inbox, so we confirm receipt without promising a reply and say so.
 */
export function resolveSuccessNotice(
    wantsReply: boolean,
    emailLeg: SupportResponse['email'],
): SuccessNotice {
    if (wantsReply && emailLeg === 'failed') {
        return {
            text: SUPPORT_SUCCESS_TEXT,
            warning:
                "Recorded, but direct reply delivery failed — we'll follow up via the recorded request.",
        }
    }
    return {
        text: wantsReply ? SUPPORT_SUCCESS_REPLY_TEXT : SUPPORT_SUCCESS_TEXT,
    }
}

type SupportOutcome =
    ({ kind: 'success' } & SuccessNotice) | { kind: 'failure' }

/**
 * The form's reading of the route's answer: a failure unless the HTTP status was
 * 2xx and the body says `ok`, otherwise the success notice for what the visitor
 * submitted (`wantsReply`) and what the server reports (`body.email`). Named
 * inputs on purpose, so the form's call site cannot swap the two silently.
 */
export function interpretSupportResponse(args: {
    httpOk: boolean
    body: Pick<SupportResponse, 'ok' | 'email'> | null
    wantsReply: boolean
}): SupportOutcome {
    const { httpOk, body, wantsReply } = args
    if (!httpOk || !body?.ok) return { kind: 'failure' }
    return { kind: 'success', ...resolveSuccessNotice(wantsReply, body.email) }
}
