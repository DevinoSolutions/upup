import { z } from 'zod'

/** The four kinds of support request the form offers. */
export const SUPPORT_TYPES = [
    'problem',
    'feature_request',
    'question',
    'other',
] as const
export type SupportType = (typeof SUPPORT_TYPES)[number]

/**
 * Drop C0/C1 control characters while KEEPING tab (0x09), newline (0x0A) and
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
        posthogSessionId: z.string().max(200).optional(),
        posthogDistinctId: z.string().max(200).optional(),
        route: z.string().max(200).optional(),
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

export type PosthogLegStatus = 'ok' | 'failed'
export type EmailLegStatus = 'ok' | 'failed' | 'not_configured'

export interface SupportResponse {
    ok: boolean
    feedbackId: string
    posthog: PosthogLegStatus
    email: EmailLegStatus
}
