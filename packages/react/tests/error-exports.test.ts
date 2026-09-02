import { describe, it, expect } from 'vitest'
import * as ReactPackage from '../src/index'
import * as CorePackage from '@upupjs/core'

// Issue #339 — the error-handling docs tell you to narrow failures with
// `instanceof UpupError` / `UpupErrorCode`, but neither name was reachable from
// @upupjs/react, so a react-only consumer had to add a direct @upupjs/core
// dependency purely to type a catch block. React now re-exports the taxonomy.
//
// Identity is the load-bearing part: a re-export that produced a SECOND class
// object would still satisfy the export-name pin while silently breaking every
// `instanceof` check across the package boundary. These tests assert the
// classes are the same objects core exports, not merely present.

const ERROR_CLASSES = [
    'UpupError',
    'UpupAuthError',
    'UpupNetworkError',
    'UpupValidationError',
    'UpupQuotaError',
    'UpupStorageError',
    'UpupConfigError',
] as const

describe('@upupjs/react error surface (#339)', () => {
    it.each(ERROR_CLASSES)(
        're-exports %s as the same class core exports',
        name => {
            const fromReact = (ReactPackage as Record<string, unknown>)[name]
            const fromCore = (CorePackage as Record<string, unknown>)[name]

            expect(fromReact).toBeTypeOf('function')
            expect(fromReact).toBe(fromCore)
        },
    )

    it('re-exports UpupErrorCode as the same enum object core exports', () => {
        expect(ReactPackage.UpupErrorCode).toBe(CorePackage.UpupErrorCode)
        expect(ReactPackage.UpupErrorCode.TYPE_MISMATCH).toBe('TYPE_MISMATCH')
    })

    it('re-exports uploadErrorFromResponse as the same function core exports', () => {
        expect(ReactPackage.uploadErrorFromResponse).toBeTypeOf('function')
        expect(ReactPackage.uploadErrorFromResponse).toBe(
            CorePackage.uploadErrorFromResponse,
        )
    })

    it('uploadErrorFromResponse builds an error that narrows to the re-exported classes', () => {
        const err = ReactPackage.uploadErrorFromResponse({
            kind: 'storage',
            status: 500,
            statusText: 'Internal Server Error',
        })

        expect(err).toBeInstanceOf(ReactPackage.UpupError)
        expect(err).toBeInstanceOf(ReactPackage.UpupStorageError)
        expect(err.code).toBe(ReactPackage.UpupErrorCode.STORAGE_ERROR)
    })

    it('every subclass still narrows to UpupError through react-only imports', () => {
        const error = new ReactPackage.UpupValidationError(
            'File type "text/plain" is not accepted',
            ReactPackage.UpupErrorCode.TYPE_MISMATCH,
            new File(['x'], 'notes.txt', { type: 'text/plain' }),
        )

        expect(error).toBeInstanceOf(ReactPackage.UpupError)
        expect(error).toBeInstanceOf(CorePackage.UpupError)
        expect(error.code).toBe(ReactPackage.UpupErrorCode.TYPE_MISMATCH)
    })

    it('narrows an error raised by the engine itself', async () => {
        const core = new CorePackage.UpupCore({
            provider: 'S3' as const,
            allowedFileTypes: 'image/*',
        })
        const caught = await core
            .addFiles([new File(['x'], 'notes.txt', { type: 'text/plain' })])
            .then(() => null)
            .catch((e: unknown) => e)

        expect(caught).toBeInstanceOf(ReactPackage.UpupError)
        expect(
            (caught as InstanceType<typeof ReactPackage.UpupError>).code,
        ).toBe(ReactPackage.UpupErrorCode.TYPE_MISMATCH)
        core.destroy()
    })
})
