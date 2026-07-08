import { describe, expect, it } from 'vitest'
import * as core from '@upup/core'
import {
    UpupError,
    UpupErrorCode,
    UpupNetworkError,
    UpupValidationError,
} from '@upup/core'

/**
 * Error-contract pin from the React consumer's viewpoint.
 *
 * Re-expressed in pass 2 (F-724): this file used to test the legacy
 * `UploadError`/`UploadErrorType` family, a parallel error taxonomy with zero
 * production call sites that was deleted from @upup/core. The supported
 * surface a React consumer catches is the UpupError taxonomy — same intent
 * (the error contract UI code relies on), supported API.
 */
describe('UpupError taxonomy — consumer contract', () => {
    it('UpupError is an Error with name, machine code, and retryable flag', () => {
        const err = new UpupError('boom', UpupErrorCode.UPLOAD_FAILED, true)
        expect(err).toBeInstanceOf(Error)
        expect(err).toBeInstanceOf(UpupError)
        expect(err.name).toBe('UpupError')
        expect(err.message).toBe('boom')
        expect(err.code).toBe(UpupErrorCode.UPLOAD_FAILED)
        expect(err.retryable).toBe(true)
    })

    it('subclasses remain catchable as UpupError with their own names', () => {
        const network = new UpupNetworkError('offline', 503)
        expect(network).toBeInstanceOf(UpupError)
        expect(network.name).toBe('UpupNetworkError')
        expect(network.code).toBe(UpupErrorCode.NETWORK_ERROR)
        expect(network.retryable).toBe(true)
        expect(network.status).toBe(503)

        const file = new File(['x'], 'a.txt')
        const validation = new UpupValidationError(
            'too big',
            UpupErrorCode.FILE_TOO_LARGE,
            file,
        )
        expect(validation).toBeInstanceOf(UpupError)
        expect(validation.name).toBe('UpupValidationError')
        expect(validation.reason).toBe(UpupErrorCode.FILE_TOO_LARGE)
        expect(validation.file).toBe(file)
    })

    it('throw/catch preserves the taxonomy through instanceof narrowing', () => {
        let caught: unknown
        try {
            throw new UpupNetworkError('timeout', 408)
        } catch (e) {
            // upup-catch: the test asserts on the caught value below
            caught = e
        }
        expect(caught).toBeInstanceOf(UpupError)
        if (caught instanceof UpupError) {
            expect(caught.code).toBe(UpupErrorCode.NETWORK_ERROR)
            expect(caught.status).toBe(408)
        }
    })

    it('the legacy UploadError family is gone from the public surface (F-724)', () => {
        expect(
            Object.keys(core).filter(k => k.startsWith('UploadError')),
        ).toEqual([])
    })
})
