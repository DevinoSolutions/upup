import { describe, it, expect } from 'vitest'
import { b64EncodeUnicode } from '@upup/core'

// ─────────────────────────────────────────────
// b64EncodeUnicode
// ─────────────────────────────────────────────
describe('b64EncodeUnicode', () => {
    it('encodes an ASCII string to base64', () => {
        expect(b64EncodeUnicode('hello')).toBe(btoa('hello'))
    })

    it('encodes an empty string to an empty base64 value', () => {
        expect(b64EncodeUnicode('')).toBe('')
    })

    it('encodes a simple URL-safe string', () => {
        const result = b64EncodeUnicode('abc123')
        expect(result).toBe(btoa('abc123'))
    })

    it('returns a string', () => {
        expect(typeof b64EncodeUnicode('test')).toBe('string')
    })

    it('encodes a unicode emoji without throwing', () => {
        // Standard btoa would throw on multi-byte chars; this function handles them
        expect(() => b64EncodeUnicode('hello 🌍')).not.toThrow()
    })

    it('encodes a unicode string and decodes back to the original', () => {
        const original = 'héllo wörld'
        const encoded = b64EncodeUnicode(original)
        // Decode: reverse the encoding (base64 → percent-encoded bytes → string)
        const decoded = decodeURIComponent(
            atob(encoded)
                .split('')
                .map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
                .join(''),
        )
        expect(decoded).toBe(original)
    })

    it('encodes Chinese characters without throwing', () => {
        expect(() => b64EncodeUnicode('你好世界')).not.toThrow()
    })

    it('round-trips Chinese characters correctly', () => {
        const original = '你好世界'
        const encoded = b64EncodeUnicode(original)
        const decoded = decodeURIComponent(
            atob(encoded)
                .split('')
                .map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
                .join(''),
        )
        expect(decoded).toBe(original)
    })

    it('round-trips Arabic characters correctly', () => {
        const original = 'مرحبا'
        const encoded = b64EncodeUnicode(original)
        const decoded = decodeURIComponent(
            atob(encoded)
                .split('')
                .map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
                .join(''),
        )
        expect(decoded).toBe(original)
    })

    it('produces only valid base64 characters', () => {
        const result = b64EncodeUnicode('test value with spaces!')
        expect(result).toMatch(/^[A-Za-z0-9+/=]*$/)
    })

    it('encodes a JSON string without throwing', () => {
        const json = JSON.stringify({ key: 'value', num: 42 })
        expect(() => b64EncodeUnicode(json)).not.toThrow()
    })

    it('round-trips a JSON string correctly', () => {
        const json = JSON.stringify({ key: 'value', num: 42 })
        const encoded = b64EncodeUnicode(json)
        const decoded = decodeURIComponent(
            atob(encoded)
                .split('')
                .map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
                .join(''),
        )
        expect(decoded).toBe(json)
    })

    it('produces consistent output for the same input', () => {
        const input = 'consistent input'
        expect(b64EncodeUnicode(input)).toBe(b64EncodeUnicode(input))
    })

    it('produces different output for different inputs', () => {
        expect(b64EncodeUnicode('foo')).not.toBe(b64EncodeUnicode('bar'))
    })

    it('encodes a newline character', () => {
        const result = b64EncodeUnicode('line1\nline2')
        expect(result).toBe(btoa('line1\nline2'))
    })

    it('encodes a tab character', () => {
        const result = b64EncodeUnicode('col1\tcol2')
        expect(result).toBe(btoa('col1\tcol2'))
    })
})
