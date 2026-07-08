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
})
