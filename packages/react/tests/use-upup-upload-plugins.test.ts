import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useUpupUpload } from '../src/use-upup-upload'

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
                plugins: [{
                    name: 'observer',
                    init: (emitter) => { emitter.on('files-added', fileHandler) },
                }],
            }),
        )

        await act(async () => {
            await result.current.addFiles([new File(['x'], 'test.txt', { type: 'text/plain' })])
        })

        expect(fileHandler).toHaveBeenCalled()
    })
})
