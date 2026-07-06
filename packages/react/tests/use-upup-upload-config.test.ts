import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useUpupUpload } from '../src/use-upup-upload'
import { UploadStatus, type UploadFile } from '@upup/core'

describe('useUpupUpload — configuration variants', () => {
    it('accepts cloudDrives nested config', () => {
        const { result } = renderHook(() =>
            useUpupUpload({
                provider: 'S3' as const,
                cloudDrives: {
                    googleDrive: { clientId: 'gd-id', apiKey: 'gd-key', appId: 'gd-app' },
                    dropbox: { appKey: 'db-key' },
                    oneDrive: { clientId: 'od-id' },
                },
            }),
        )
        expect(result.current.status).toBe(UploadStatus.IDLE)
        expect(result.current.core.options.cloudDrives?.googleDrive?.clientId).toBe('gd-id')
    })

    it('does not infer hosted serverUrl from apiKey-like legacy input', () => {
        const { result } = renderHook(() =>
            useUpupUpload({ provider: 'S3' as const, apiKey: 'key-123' } as unknown as Parameters<typeof useUpupUpload>[0]),
        )
        expect(result.current.core.options.serverUrl).toBeUndefined()
    })

    it('keeps explicit serverUrl when legacy apiKey-like input is present', () => {
        const { result } = renderHook(() =>
            useUpupUpload({ provider: 'S3' as const, apiKey: 'key', serverUrl: 'https://custom.api' } as unknown as Parameters<typeof useUpupUpload>[0]),
        )
        expect(result.current.core.options.serverUrl).toBe('https://custom.api')
    })

    it('accepts enableWorkers option', () => {
        const { result } = renderHook(() =>
            useUpupUpload({ provider: 'S3' as const, enableWorkers: true }),
        )
        expect(result.current.core.options.enableWorkers).toBe(true)
    })

    it('accepts checksumVerification option', () => {
        const { result } = renderHook(() =>
            useUpupUpload({ provider: 'S3' as const, checksumVerification: true }),
        )
        expect(result.current.core.options.checksumVerification).toBe(true)
    })

    it('accepts pipeline option', () => {
        const customStep = {
            name: 'custom',
            process: async (file: UploadFile) => file,
        }
        const { result } = renderHook(() =>
            useUpupUpload({ provider: 'S3' as const, pipeline: [customStep] }),
        )
        expect(result.current.core).toBeDefined()
    })

    it('accepts maxConcurrentUploads option', () => {
        const { result } = renderHook(() =>
            useUpupUpload({ provider: 'S3' as const, maxConcurrentUploads: 5 }),
        )
        expect(result.current.core.options.maxConcurrentUploads).toBe(5)
    })

    it('minimal config — provider only', () => {
        const { result } = renderHook(() =>
            useUpupUpload({ provider: 'S3' as const }),
        )
        expect(result.current.status).toBe(UploadStatus.IDLE)
        expect(result.current.files).toEqual([])
        expect(result.current.core).toBeDefined()
    })
})
