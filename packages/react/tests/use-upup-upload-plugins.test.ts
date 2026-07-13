import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useUpupUpload } from '../src/use-upup-upload'
import type { ExtensionMethods } from '@useupup/core'

describe('useUpupUpload — plugin integration', () => {
    it('accepts plugins via options', () => {
        const init = vi.fn()
        const { result } = renderHook(() =>
            useUpupUpload({
                provider: 'S3' as const,
                plugins: [{ name: 'test-plugin', init }],
            }),
        )
        expect(init).toHaveBeenCalledOnce()
        expect(result.current.core).toBeDefined()
    })

    it('plugin can observe file additions via on()', async () => {
        const fileHandler = vi.fn()
        const { result } = renderHook(() =>
            useUpupUpload({
                provider: 'S3' as const,
                plugins: [
                    {
                        name: 'observer',
                        init: emitter => {
                            emitter.on('files-added', fileHandler)
                        },
                    },
                ],
            }),
        )

        await act(async () => {
            await result.current.addFiles([
                new File(['x'], 'test.txt', { type: 'text/plain' }),
            ])
        })

        expect(fileHandler).toHaveBeenCalled()
    })

    // Re-pin of the former "ext getter reflects registered extensions" test through
    // the supported API: F-607 removed lifecycle-time registration (init receives the
    // emitter, not core), so extensions are registered via the public
    // core.registerExtension() and read back through core.ext. (The hook's `ext` field
    // is a render-time snapshot of core.ext; core.ext is the live getter, so we assert
    // against it after a post-mount registration.)
    it('ext getter reflects extensions registered via core.registerExtension()', () => {
        const { result } = renderHook(() =>
            useUpupUpload({ provider: 'S3' as const }),
        )
        act(() => {
            result.current.core.registerExtension('myExt', {
                value: 42,
            } as unknown as ExtensionMethods)
        })
        expect(result.current.core.ext.myExt).toEqual({ value: 42 })
    })
})
