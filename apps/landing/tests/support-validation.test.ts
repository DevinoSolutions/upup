import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { stripControlChars, supportRequestSchema } from '@/lib/support/schema'

const valid = (over: Record<string, unknown> = {}) => ({
    type: 'problem',
    message: 'The uploader stalls at 50% on large files.',
    wantsReply: false,
    feedbackId: randomUUID(),
    ...over,
})

describe('supportRequestSchema', () => {
    it('accepts a valid anonymous request with no reply requested', () => {
        const result = supportRequestSchema.safeParse(valid())
        expect(result.success).toBe(true)
    })

    it('rejects a request whose message is empty after trimming', () => {
        const result = supportRequestSchema.safeParse(valid({ message: '   ' }))
        expect(result.success).toBe(false)
    })

    it('rejects a message longer than 5000 characters', () => {
        const result = supportRequestSchema.safeParse(
            valid({ message: 'x'.repeat(5001) }),
        )
        expect(result.success).toBe(false)
    })

    it('rejects a malformed email address', () => {
        const result = supportRequestSchema.safeParse(
            valid({ wantsReply: true, email: 'not-an-email' }),
        )
        expect(result.success).toBe(false)
    })

    it('rejects a reply request that omits the email', () => {
        const result = supportRequestSchema.safeParse(
            valid({ wantsReply: true }),
        )
        expect(result.success).toBe(false)
    })

    it('accepts a reply request with a well-formed email', () => {
        const result = supportRequestSchema.safeParse(
            valid({ wantsReply: true, email: 'dev@example.com' }),
        )
        expect(result.success).toBe(true)
    })

    it('accepts the wire-only provider_notify type', () => {
        const result = supportRequestSchema.safeParse(
            valid({
                type: 'provider_notify',
                wantsReply: true,
                email: 'dev@example.com',
            }),
        )
        expect(result.success).toBe(true)
    })

    it('rejects a type outside the accepted set', () => {
        const result = supportRequestSchema.safeParse(
            valid({ type: 'not_a_real_type' }),
        )
        expect(result.success).toBe(false)
    })

    it('rejects a feedbackId that is not a UUID', () => {
        const result = supportRequestSchema.safeParse(
            valid({ feedbackId: 'abc-123' }),
        )
        expect(result.success).toBe(false)
    })
})

describe('stripControlChars', () => {
    it('removes control characters but keeps newlines and tabs', () => {
        const nul = String.fromCharCode(0)
        const bel = String.fromCharCode(7)
        const dirty = ['a', nul, 'b', '\n', 'c', '\t', 'd', bel, 'e'].join('')
        expect(stripControlChars(dirty)).toBe(
            ['a', 'b', '\n', 'c', '\t', 'd', 'e'].join(''),
        )
    })
})

describe('supportRequestSchema input hardening (T-5495)', () => {
    it('collapses line breaks and control characters out of the single-line route field so it cannot forge email-body lines', () => {
        const result = supportRequestSchema.safeParse(
            valid({ route: '/docs\r\nApp: forged\u0000@9.9.9\u0007' }),
        )
        expect(result.success).toBe(true)
        expect(result.success && result.data.route).toBe(
            '/docs App: forged@9.9.9',
        )
    })

    it('strips control characters from the PostHog session id', () => {
        const result = supportRequestSchema.safeParse(
            valid({ posthogSessionId: 'sess\nion\u0000-1' }),
        )
        expect(result.success && result.data.posthogSessionId).toBe(
            'sess ion-1',
        )
    })

    it('keeps a posthog-js anonymous UUID distinct id', () => {
        const id = randomUUID()
        const result = supportRequestSchema.safeParse(
            valid({ posthogDistinctId: id }),
        )
        expect(result.success && result.data.posthogDistinctId).toBe(id)
    })

    it('keeps the homepage sign-up person id (signup:<uuid>)', () => {
        const id = `signup:${randomUUID()}`
        const result = supportRequestSchema.safeParse(
            valid({ posthogDistinctId: id }),
        )
        expect(result.success && result.data.posthogDistinctId).toBe(id)
    })

    it('drops a distinct id that is not an anonymous or sign-up id, so a client cannot attribute events to an arbitrary person', () => {
        for (const forged of ['admin@example.com', 'user_12345', 'signup:x']) {
            const result = supportRequestSchema.safeParse(
                valid({ posthogDistinctId: forged }),
            )
            expect(result.success).toBe(true)
            expect(result.success && result.data.posthogDistinctId).toBe(
                undefined,
            )
        }
    })
})

describe('toSingleLine C1 handling (T-5941)', () => {
    it('strips C1 control characters such as U+0085 (NEL) from single-line fields', () => {
        const result = supportRequestSchema.safeParse(
            valid({ route: `/a${String.fromCharCode(0x85, 0x9f)}b` }),
        )
        expect(result.success && result.data.route).toBe('/ab')
    })
})
