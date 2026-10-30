import { describe, it, expect } from 'vitest'
import { matchesAllowedType } from '../src/upload-routes'

// F-743: one shared allowed-types policy for the presign/multipart path AND the
// drive-transfer path. These pin the exact semantics both callers now depend on.
describe('matchesAllowedType (F-743 shared policy)', () => {
    it('accepts everything when no allowlist is configured', () => {
        expect(matchesAllowedType('image/png', undefined)).toBe(true)
        expect(matchesAllowedType('image/png', [])).toBe(true)
        expect(matchesAllowedType('', undefined)).toBe(true)
    })

    it('matches an exact type', () => {
        expect(matchesAllowedType('image/png', ['image/png'])).toBe(true)
        expect(matchesAllowedType('video/mp4', ['image/png'])).toBe(false)
    })

    it('honours the `image/*` wildcard (the case exact Array.includes rejected)', () => {
        expect(matchesAllowedType('image/png', ['image/*'])).toBe(true)
        expect(matchesAllowedType('image/jpeg', ['image/*'])).toBe(true)
        expect(matchesAllowedType('video/mp4', ['image/*'])).toBe(false)
    })

    it('treats an absent/empty type as a NON-match against a non-empty allowlist', () => {
        // Callers pass `mimeType ?? ''`, so a missing type is rejected identically
        // on the upload and drive-transfer paths — never bypassed.
        expect(matchesAllowedType('', ['image/*'])).toBe(false)
        expect(matchesAllowedType('', ['image/png'])).toBe(false)
    })

    // RFC 2045: MIME types and subtypes are case-insensitive, so a client
    // claiming `IMAGE/PNG` must match an allowlist written in lower case (and
    // vice versa). Case is folded on BOTH sides; nothing else is loosened.
    it('matches an exact type case-insensitively on both sides', () => {
        expect(matchesAllowedType('IMAGE/PNG', ['image/png'])).toBe(true)
        expect(matchesAllowedType('image/png', ['IMAGE/PNG'])).toBe(true)
    })

    it('honours the wildcard case-insensitively on both sides', () => {
        expect(matchesAllowedType('Image/Png', ['image/*'])).toBe(true)
        expect(matchesAllowedType('image/png', ['IMAGE/*'])).toBe(true)
        expect(matchesAllowedType('IMAGE/PNG', ['Image/*'])).toBe(true)
    })

    it('still rejects a different type or an empty type after case folding', () => {
        expect(matchesAllowedType('TEXT/PLAIN', ['image/*'])).toBe(false)
        expect(matchesAllowedType('text/plain', ['image/*'])).toBe(false)
        expect(matchesAllowedType('', ['IMAGE/PNG'])).toBe(false)
        expect(matchesAllowedType('', ['IMAGE/*'])).toBe(false)
    })

    it('folds case for ASCII only: a non-ASCII lookalike never matches', () => {
        // U+212A KELVIN SIGN lower-cases to ASCII "k" under toLowerCase().
        expect(matchesAllowedType('text/marKdown', ['text/markdown'])).toBe(
            false,
        )
        expect(matchesAllowedType('text/markdown', ['text/marKdown'])).toBe(
            false,
        )
    })

    it('treats a non-string type as a non-match instead of throwing', () => {
        // The drive route hands over an unchecked `body.mimeType` cast.
        const bad = 123 as unknown as string
        expect(matchesAllowedType(bad, ['image/png'])).toBe(false)
        expect(matchesAllowedType(bad, ['image/*'])).toBe(false)
        expect(matchesAllowedType(bad, undefined)).toBe(true)
    })
})
