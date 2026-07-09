import { describe, it, expect } from 'vitest'
import { b64EncodeUnicode } from '@upup/core/internal'

// Split out of the former utils.test.ts (one utility per behavior-named file,
// matching core's cn-util.test.ts / encoder.test.ts sibling convention).
describe('b64EncodeUnicode', () => {
    it('encodes ASCII string', () => {
        const encoded = b64EncodeUnicode('hello')
        expect(atob(encoded)).toBe('hello')
    })

    it('encodes string with special characters', () => {
        const encoded = b64EncodeUnicode('hello world!')
        expect(atob(encoded)).toBe('hello world!')
    })

    it('encodes unicode characters', () => {
        const encoded = b64EncodeUnicode('café')
        expect(encoded).toBeTruthy()
        // Should be decodable
        expect(typeof encoded).toBe('string')
        expect(encoded.length).toBeGreaterThan(0)
    })

    it('encodes file paths', () => {
        const encoded = b64EncodeUnicode('photos/vacation/beach.jpg')
        expect(atob(encoded)).toBe('photos/vacation/beach.jpg')
    })

    it('encodes empty string', () => {
        const encoded = b64EncodeUnicode('')
        expect(atob(encoded)).toBe('')
    })

    it('produces different outputs for different inputs', () => {
        const a = b64EncodeUnicode('file-a.txt')
        const b = b64EncodeUnicode('file-b.txt')
        expect(a).not.toBe(b)
    })

    it('handles filenames with spaces', () => {
        const encoded = b64EncodeUnicode('my document.pdf')
        expect(atob(encoded)).toBe('my document.pdf')
    })
})
