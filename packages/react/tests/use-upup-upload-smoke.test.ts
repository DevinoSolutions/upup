import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useUpupUpload } from '../src/use-upup-upload'
import { UploadStatus } from '@upup/core'

const makeFile = (name: string, size = 10) =>
    new File(['x'.repeat(size)], name, { type: 'text/plain' })

describe('useUpupUpload — end-to-end smoke test', () => {
    it('complete lifecycle: init → add → reorder → remove → add → removeAll → destroy', async () => {
        const onFileAdded = vi.fn()
        const onFileRemoved = vi.fn()
        const events: string[] = []

        const { result, unmount } = renderHook(() =>
            useUpupUpload({
                provider: 'S3' as const,
                allowedFileTypes: 'text/plain',
                limit: 5,
                maxFileSize: { size: 1, unit: 'MB' },
                onFileAdded,
                onFileRemoved,
            }),
        )

        // 1. Initial state
        expect(result.current.status).toBe(UploadStatus.IDLE)
        expect(result.current.files).toEqual([])
        expect(result.current.error).toBeNull()

        // 2. Subscribe to core events
        act(() => {
            result.current.on('files-added', () => events.push('added'))
            result.current.on('file-removed', () => events.push('removed'))
        })

        // 3. Add files
        await act(async () => {
            await result.current.addFiles([
                makeFile('a.txt'),
                makeFile('b.txt'),
                makeFile('c.txt'),
            ])
        })
        expect(result.current.files.length).toBe(3)
        expect(onFileAdded).toHaveBeenCalled()

        // 4. Reorder
        const ids = result.current.files.map(f => f.id)
        act(() => {
            result.current.reorderFiles([...ids].reverse())
        })
        expect(result.current.files.map(f => f.id)).toEqual([...ids].reverse())

        // 5. Remove one file
        act(() => {
            result.current.removeFile(result.current.files[0]!.id)
        })
        expect(result.current.files.length).toBe(2)
        expect(onFileRemoved).toHaveBeenCalled()

        // 6. Add another
        await act(async () => {
            await result.current.addFiles([makeFile('d.txt')])
        })
        expect(result.current.files.length).toBe(3)

        // 7. Verify core is in sync
        expect(result.current.core.files.size).toBe(3)
        expect(result.current.core.status).toBe(UploadStatus.IDLE)

        // 8. Verify progress
        expect(result.current.core.progress.totalFiles).toBe(3)
        expect(result.current.core.progress.completedFiles).toBe(0)

        // 9. Validate a file without modifying state
        const validationResults = await result.current.core.validateFiles([
            makeFile('valid.txt'),
        ])
        expect(validationResults[0]!.valid).toBe(true)
        expect(result.current.files.length).toBe(3) // unchanged

        // 10. Remove all
        act(() => {
            result.current.removeAll()
        })
        expect(result.current.files.length).toBe(0)

        // 11. Verify prop getters still work
        const dropProps = result.current.getDropzoneProps()
        expect(typeof dropProps.onDrop).toBe('function')
        const inputProps = result.current.getInputProps()
        expect(inputProps.type).toBe('file')
        expect(inputProps.accept).toBe('text/plain')

        // 12. Unmount cleanly
        unmount()
    })

    it('restriction enforcement throughout lifecycle', async () => {
        const { result } = renderHook(() =>
            useUpupUpload({
                provider: 'S3' as const,
                allowedFileTypes: 'text/plain',
                maxFileSize: { size: 50, unit: 'B' },
                limit: 2,
            }),
        )

        // Accept valid file
        await act(async () => {
            await result.current.addFiles([makeFile('ok.txt', 10)])
        })
        expect(result.current.files.length).toBe(1)

        // Reject wrong type
        await act(async () => {
            try {
                await result.current.addFiles([
                    new File(['x'], 'bad.png', { type: 'image/png' }),
                ])
            } catch {
                /* upup-catch: expected rejection in this negative-path test; asserted below */
            }
        })
        expect(result.current.files.length).toBe(1)

        // Reject too large
        await act(async () => {
            try {
                await result.current.addFiles([makeFile('huge.txt', 100)])
            } catch {
                /* upup-catch: expected rejection in this negative-path test; asserted below */
            }
        })
        expect(result.current.files.length).toBe(1)

        // Accept second valid file
        await act(async () => {
            await result.current.addFiles([makeFile('ok2.txt', 20)])
        })
        expect(result.current.files.length).toBe(2)

        // Reject over limit
        await act(async () => {
            try {
                await result.current.addFiles([makeFile('over.txt', 5)])
            } catch {
                /* upup-catch: expected rejection in this negative-path test; asserted below */
            }
        })
        expect(result.current.files.length).toBe(2) // limit enforced
    })
})
