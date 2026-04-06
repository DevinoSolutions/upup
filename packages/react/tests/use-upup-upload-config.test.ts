import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useUpupUpload } from '../src/use-upup-upload'
import { UploadStatus } from '@upup/shared'

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

    it('accepts apiKey and auto-sets serverUrl', () => {
        const { result } = renderHook(() =>
            useUpupUpload({ provider: 'S3' as const, apiKey: 'key-123' }),
        )
        expect(result.current.core.options.apiKey).toBe('key-123')
        expect(result.current.core.options.serverUrl).toBe('https://api.upup.dev/v1')
    })

    it('explicit serverUrl overrides apiKey auto-URL', () => {
        const { result } = renderHook(() =>
            useUpupUpload({ provider: 'S3' as const, apiKey: 'key', serverUrl: 'https://custom.api' }),
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
            process: async (file: any) => file,
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
