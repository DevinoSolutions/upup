import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useUpupUpload } from '../src/use-upup-upload'

describe('useUpupUpload — plugin integration', () => {
    it('accepts plugins via options', () => {
        const setup = vi.fn()
        const { result } = renderHook(() =>
            useUpupUpload({
                provider: 'S3' as const,
                plugins: [{ name: 'test-plugin', setup }],
            }),
        )
        expect(setup).toHaveBeenCalledOnce()
        expect(result.current.core).toBeDefined()
    })

    it('plugin can observe file additions via on()', async () => {
        const fileHandler = vi.fn()
        const { result } = renderHook(() =>
            useUpupUpload({
                provider: 'S3' as const,
                plugins: [{
                    name: 'observer',
                    setup: (core) => { core.on('files-added', fileHandler) },
                }],
            }),
        )

        await act(async () => {
            await result.current.addFiles([new File(['x'], 'test.txt', { type: 'text/plain' })])
        })

        expect(fileHandler).toHaveBeenCalled()
    })

    it('ext getter reflects registered extensions', () => {
        const { result } = renderHook(() =>
            useUpupUpload({
                provider: 'S3' as const,
                plugins: [{
                    name: 'with-ext',
                    setup: (core) => {
                        (core as any).pluginManager.registerExtension('myExt', { value: 42 })
                    },
                }],
            }),
        )

        expect(result.current.ext).toBeDefined()
        expect(result.current.ext.myExt).toEqual({ value: 42 })
    })
})
