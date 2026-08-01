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
