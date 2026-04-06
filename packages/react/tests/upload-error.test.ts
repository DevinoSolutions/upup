import { describe, it, expect } from 'vitest'
import { UploadError, UploadErrorType } from '../src/shared/types'

// ─────────────────────────────────────────────
// Construction — defaults
// ─────────────────────────────────────────────
describe('UploadError — defaults', () => {
    it('is an instance of Error', () => {
        expect(new UploadError('oops')).toBeInstanceOf(Error)
    })

    it('is an instance of UploadError', () => {
        expect(new UploadError('oops')).toBeInstanceOf(UploadError)
    })

    it('sets message correctly', () => {
        expect(new UploadError('something went wrong').message).toBe('something went wrong')
    })

    it('name is UploadError', () => {
        expect(new UploadError('oops').name).toBe('UploadError')
    })

    it('defaults type to UNKNOWN_UPLOAD_ERROR', () => {
        expect(new UploadError('oops').type).toBe(UploadErrorType.UNKNOWN_UPLOAD_ERROR)
    })

    it('defaults retryable to false', () => {
        expect(new UploadError('oops').retryable).toBe(false)
    })

    it('defaults status to 500', () => {
        expect(new UploadError('oops').status).toBe(500)
    })
})

// ─────────────────────────────────────────────
// Construction — explicit values
// ─────────────────────────────────────────────
describe('UploadError — explicit values', () => {
    it('sets type when provided', () => {
        const err = new UploadError('forbidden', UploadErrorType.PERMISSION_ERROR)
        expect(err.type).toBe(UploadErrorType.PERMISSION_ERROR)
    })

    it('sets retryable=true when provided', () => {
        const err = new UploadError('network', UploadErrorType.UNKNOWN_UPLOAD_ERROR, true)
        expect(err.retryable).toBe(true)
    })

    it('sets explicit status when provided', () => {
        const err = new UploadError('not found', UploadErrorType.PRESIGNED_URL_ERROR, false, 404)
        expect(err.status).toBe(404)
    })

    it('falls back to 500 when status is undefined', () => {
        const err = new UploadError('error', UploadErrorType.UNKNOWN_UPLOAD_ERROR, false, undefined)
        expect(err.status).toBe(500)
    })
})

// ─────────────────────────────────────────────
// All error types
// ─────────────────────────────────────────────
describe('UploadError — all UploadErrorType values', () => {
    it.each(Object.values(UploadErrorType))('can be constructed with type %s', (type) => {
        const err = new UploadError('test', type)
        expect(err.type).toBe(type)
    })
})

// ─────────────────────────────────────────────
// instanceof and catch
// ─────────────────────────────────────────────
describe('UploadError — catch behavior', () => {
    it('can be thrown and caught as Error', () => {
        expect(() => {
            throw new UploadError('thrown')
        }).toThrow(Error)
    })

    it('can be thrown and caught with the right message', () => {
        expect(() => {
            throw new UploadError('specific message')
        }).toThrow('specific message')
    })

    it('preserves type after catch', () => {
        let caught: unknown
        try {
            throw new UploadError('err', UploadErrorType.EXPIRED_URL)
        } catch (e) {
            caught = e
        }
        expect((caught as UploadError).type).toBe(UploadErrorType.EXPIRED_URL)
    })

    it('preserves retryable after catch', () => {
        let caught: unknown
        try {
            throw new UploadError('retry me', UploadErrorType.CORS_CONFIG_ERROR, true)
        } catch (e) {
            caught = e
        }
        expect((caught as UploadError).retryable).toBe(true)
    })
})
