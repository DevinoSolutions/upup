import { describe, it, expect } from 'vitest'
import { resolveUploadConfig } from '../src/resolve-upload-config'
import { ServerCredentials } from '../src/strategies/server-credentials'
import { TokenEndpointCredentials } from '../src/strategies/token-endpoint'
import type { CoreOptions } from '../src/core'
import type { UploadFile } from '../src/types/upload-file'

describe('resolveUploadConfig', () => {
    it('throws AMBIGUOUS_UPLOAD_TARGET when more than one target is configured', () => {
        expect(() =>
            resolveUploadConfig({
                uploadEndpoint: 'https://a',
                serverUrl: 'https://b',
            } as CoreOptions),
        ).toThrow(/exactly one upload target/i)
    })

    it('selects ServerCredentials when serverUrl is set', () => {
        expect(
            resolveUploadConfig({ serverUrl: 'https://s' } as CoreOptions)
                .credentials,
        ).toBeInstanceOf(ServerCredentials)
    })

    it('selects TokenEndpointCredentials when uploadEndpoint is set', () => {
        expect(
            resolveUploadConfig({ uploadEndpoint: 'https://e' } as CoreOptions)
                .credentials,
        ).toBeInstanceOf(TokenEndpointCredentials)
    })

    it('defaults maxConcurrentUploads to 3 and honors an explicit value', () => {
        expect(
            resolveUploadConfig({ serverUrl: 'https://s' } as CoreOptions)
                .maxConcurrentUploads,
        ).toBe(3)
        expect(
            resolveUploadConfig({
                serverUrl: 'https://s',
                maxConcurrentUploads: 7,
            } as CoreOptions).maxConcurrentUploads,
        ).toBe(7)
    })

    // Cross-reload resume: `persist` is opted in HERE (defaulting to true) and
    // scoped to the serverUrl that issued the tokens, so a session saved
    // against one server can never be replayed at another.
    describe('multipart persistence wiring', () => {
        function multipartStrategy(options: Partial<CoreOptions>) {
            const cfg = resolveUploadConfig({
                serverUrl: 'https://s',
                resumable: { protocol: 'multipart' },
                ...options,
            } as CoreOptions)
            return cfg.resolveUploadStrategy!({
                size: 10 * 1024 * 1024,
            } as UploadFile).uploadStrategy as unknown as {
                persist: boolean
                sessionScope: string | undefined
                maxConcurrentParts: number
            }
        }

        it('turns session persistence on by default for multipart uploads', () => {
            expect(multipartStrategy({}).persist).toBe(true)
        })

        it('honors an explicit persist: false opt-out', () => {
            expect(
                multipartStrategy({
                    resumable: { protocol: 'multipart', persist: false },
                }).persist,
            ).toBe(false)
        })

        it('scopes sessions to the configured serverUrl', () => {
            expect(multipartStrategy({}).sessionScope).toBe('https://s')
        })

        it('keeps the three-parts-in-flight default and forwards an explicit maxConcurrentParts', () => {
            expect(multipartStrategy({}).maxConcurrentParts).toBe(3)
            expect(
                multipartStrategy({
                    resumable: {
                        protocol: 'multipart',
                        maxConcurrentParts: 6,
                    },
                }).maxConcurrentParts,
            ).toBe(6)
        })
    })

    it('resolveUploadStrategy presigns the direct strategy by default', () => {
        const cfg = resolveUploadConfig({
            serverUrl: 'https://s',
        } as CoreOptions)
        const result = cfg.resolveUploadStrategy!({ size: 10 } as UploadFile)
        expect(result).toEqual({
            uploadStrategy: cfg.uploadStrategy,
            presign: true,
        })
    })
})
