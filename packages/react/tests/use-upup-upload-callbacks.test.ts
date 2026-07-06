import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useUpupUpload } from '../src/use-upup-upload'

const makeFile = (name: string, size = 10, type = 'text/plain') =>
    new File(['x'.repeat(size)], name, { type })

describe('useUpupUpload — onBeforeFileAdded File replacement', () => {
    it('replaces file when callback returns a new File', async () => {
        const replacement = makeFile('renamed.txt', 5)
        const { result } = renderHook(() =>
            useUpupUpload({
                provider: 'S3' as const,
                onBeforeFileAdded: async () => replacement,
            }),
        )
        await act(async () => {
            await result.current.addFiles([makeFile('original.txt')])
        })
        expect(result.current.files.length).toBe(1)
        expect(result.current.files[0].name).toBe('renamed.txt')
    })

    it('callback receives the file being added', async () => {
        const cb = vi.fn(async (_file: File) => true)
        const { result } = renderHook(() =>
            useUpupUpload({
                provider: 'S3' as const,
                onBeforeFileAdded: cb,
            }),
        )
        const file = makeFile('check.txt')
        await act(async () => {
            await result.current.addFiles([file])
        })
        expect(cb).toHaveBeenCalledWith(expect.objectContaining({ name: 'check.txt' }))
    })
})

describe('useUpupUpload — getRootProps', () => {
    it('returns role=application', () => {
        const { result } = renderHook(() =>
            useUpupUpload({ provider: 'S3' as const }),
        )
        const props = result.current.getRootProps()
        expect(props.role).toBe('application')
    })

    it('returns aria-label', () => {
        const { result } = renderHook(() =>
            useUpupUpload({ provider: 'S3' as const }),
        )
        const props = result.current.getRootProps()
        expect(props['aria-label']).toBe('File uploader')
    })

    it('aria-busy is false when idle', () => {
        const { result } = renderHook(() =>
            useUpupUpload({ provider: 'S3' as const }),
        )
        expect(result.current.getRootProps()['aria-busy']).toBe(false)
    })

    it('merges custom overrides into root props', () => {
        const { result } = renderHook(() =>
            useUpupUpload({ provider: 'S3' as const }),
        )
        const props = result.current.getRootProps({
            className: 'my-uploader',
            'data-testid': 'root',
        } as unknown as HTMLAttributes<HTMLElement>)
        expect(props.className).toBe('my-uploader')
        expect(props['data-testid']).toBe('root')
        expect(props.role).toBe('application')
    })
})

describe('useUpupUpload — getDropzoneProps through hook', () => {
    it('returns all required drag/drop handlers', () => {
        const { result } = renderHook(() =>
            useUpupUpload({ provider: 'S3' as const }),
        )
        const props = result.current.getDropzoneProps()
        expect(typeof props.onDragOver).toBe('function')
        expect(typeof props.onDragLeave).toBe('function')
        expect(typeof props.onDrop).toBe('function')
        expect(typeof props.onPaste).toBe('function')
    })

    it('returns aria attributes', () => {
        const { result } = renderHook(() =>
            useUpupUpload({ provider: 'S3' as const }),
        )
        const props = result.current.getDropzoneProps()
        expect(props.role).toBe('region')
        expect(props['aria-label']).toBeDefined()
    })
})
