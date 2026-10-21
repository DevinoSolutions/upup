import { z } from 'zod'

/** The four kinds of support request the support FORM offers as options. */
export const SUPPORT_FORM_TYPES = [
    'problem',
    'feature_request',
    'question',
    'other',
] as const
export type SupportFormType = (typeof SUPPORT_FORM_TYPES)[number]

/**
 * Every type the API accepts: the form's four, plus `provider_notify` — what the
 * homepage provider-interest modal submits. That modal has no free-text field,
 * so it composes its message from the provider name and sends the visitor's
 * address as the reply-to. It is deliberately NOT a form option: the support
 * page's dropdown renders SUPPORT_FORM_TYPES, so a wire-only type never appears
 * as something a human can pick.
 */
export const SUPPORT_TYPES = [...SUPPORT_FORM_TYPES, 'provider_notify'] as const
export type SupportType = (typeof SUPPORT_TYPES)[number]

/**
 * Drop C0 control characters and DEL while KEEPING tab (0x09), newline (0x0A) and
 * carriage return (0x0D), so a multi-line message survives. Implemented by
 * codepoint rather than a control-character regex (which linters flag).
 */
export function stripControlChars(value: string): string {
    let out = ''
    for (const ch of value) {
        const code = ch.codePointAt(0) ?? 0
        const isControl =
            code <= 0x08 ||
            code === 0x0b ||
            code === 0x0c ||
            (code >= 0x0e && code <= 0x1f) ||
            code === 0x7f
        if (!isControl) out += ch
    }
    return out
}

/**
 * For fields rendered on ONE line of the support email (route, PostHog ids):
 * strip control characters (including the C1 range 0x80-0x9F, which
 * `stripControlChars` leaves alone), then collapse any remaining tab/CR/LF to a space so
 * a value cannot start a forged `Key: value` line in the email body.
 */
export function toSingleLine(value: string): string {
    let out = ''
    for (const ch of stripControlChars(value)) {
        const code = ch.codePointAt(0) ?? 0
        if (code < 0x80 || code > 0x9f) out += ch
    }
    return out.replace(/\s+/g, ' ').trim()
}

/** posthog-js anonymous ids are UUIDs; the homepage sign-up flow identifies as `signup:<uuid>`. */
const POSTHOG_DISTINCT_ID =
    /^(?:signup:)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Shared request schema — imported by both the client form and the API route
 * so a single source defines the contract. Trims + strips control characters,
 * enforces the length bounds, and requires an email only when a reply is
 * wanted. `website` is the honeypot: any value validates here (the route reads
 * it and silently drops filled submissions rather than rejecting them).
 */
export const supportRequestSchema = z
    .object({
        type: z.enum(SUPPORT_TYPES),
        message: z
            .string()
            .trim()
            .min(1)
            .max(5000)
            .transform(stripControlChars),
        expectedOutcome: z
            .string()
            .trim()
            .max(2000)
            .transform(stripControlChars)
            .optional(),
        wantsReply: z.boolean(),
        email: z.string().max(320).email().optional(),
        feedbackId: z.string().uuid(),
        posthogSessionId: z
            .string()
            .max(200)
            .transform(toSingleLine)
            .optional(),
        // The server uses this as the captured event's distinct_id, so an
        // arbitrary client value could attribute events to any person. Only
        // the two shapes this site's client produces are kept; anything else
        // is dropped (the event falls back to `anonymous:<feedbackId>`).
        posthogDistinctId: z
            .string()
            .max(200)
            .transform(value =>
                POSTHOG_DISTINCT_ID.test(value) ? value : undefined,
            )
            .optional(),
        route: z.string().max(200).transform(toSingleLine).optional(),
        website: z.string().max(500).optional(),
        // E2E correlation channel — honored ONLY on the `e2e` dataset (the route
        // merges them into the captured event's properties there and ignores
        // them everywhere else). Constrained charset keeps them safe as event
        // property values / query filters.
        testRunId: z
            .string()
            .max(100)
            .regex(/^[A-Za-z0-9:_-]+$/)
            .optional(),
        testScenario: z
            .string()
            .max(100)
            .regex(/^[A-Za-z0-9:_-]+$/)
            .optional(),
    })
    .refine(data => !data.wantsReply || Boolean(data.email), {
        message: 'Email is required when you request a reply.',
        path: ['email'],
    })

export type SupportRequest = z.infer<typeof supportRequestSchema>

// ── Response contract (shared client/route shape) ────────────────────────

export type PosthogLegStatus = 'ok' | 'failed' | 'skipped'
export type EmailLegStatus = 'ok' | 'failed' | 'not_configured'

export interface SupportResponse {
    ok: boolean
    feedbackId: string
    posthog: PosthogLegStatus
    email: EmailLegStatus
}
