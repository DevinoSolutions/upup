import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useUpupUpload } from '../src/use-upup-upload'

const makeFile = (name: string, size = 10, type = 'text/plain') =>
    new File(['x'.repeat(size)], name, { type })

describe('useUpupUpload — flat file restrictions', () => {
    it('enforces the file-count limit', async () => {
        const { result } = renderHook(() =>
            useUpupUpload({
                provider: 'S3' as const,
                limit: 2,
            }),
        )
        await act(async () => {
            await result.current.addFiles([
                makeFile('a.txt'),
                makeFile('b.txt'),
            ])
        })
        expect(result.current.files.length).toBe(2)

        await act(async () => {
            try {
                await result.current.addFiles([makeFile('c.txt')])
            } catch {
                /* upup-catch: expected rejection in this negative-path test; asserted below */
            }
        })
        expect(result.current.files.length).toBe(2) // still 2
    })

    it('enforces maxFileSize', async () => {
        const { result } = renderHook(() =>
            useUpupUpload({
                provider: 'S3' as const,
                maxFileSize: { size: 5, unit: 'B' },
            }),
        )
        await act(async () => {
            try {
                await result.current.addFiles([makeFile('big.txt', 50)])
            } catch {
                /* upup-catch: expected rejection in this negative-path test; asserted below */
            }
        })
        expect(result.current.files.length).toBe(0)
    })

    it('enforces allowedFileTypes', async () => {
        const { result } = renderHook(() =>
            useUpupUpload({
                provider: 'S3' as const,
                allowedFileTypes: 'image/*',
            }),
        )
        await act(async () => {
            try {
                await result.current.addFiles([
                    makeFile('doc.txt', 10, 'text/plain'),
                ])
            } catch {
                /* upup-catch: expected rejection in this negative-path test; asserted below */
            }
        })
        expect(result.current.files.length).toBe(0)

        await act(async () => {
            await result.current.addFiles([
                makeFile('pic.png', 10, 'image/png'),
            ])
        })
        expect(result.current.files.length).toBe(1)
    })
})

describe('useUpupUpload — onBeforeFileAdded', () => {
    it('rejects file when callback returns false', async () => {
        const { result } = renderHook(() =>
            useUpupUpload({
                provider: 'S3' as const,
                onBeforeFileAdded: async () => false,
            }),
        )
        await act(async () => {
            await result.current.addFiles([makeFile('blocked.txt')])
        })
        expect(result.current.files.length).toBe(0)
    })

    it('accepts file when callback returns true', async () => {
        const { result } = renderHook(() =>
            useUpupUpload({
                provider: 'S3' as const,
                onBeforeFileAdded: async () => true,
            }),
        )
        await act(async () => {
            await result.current.addFiles([makeFile('allowed.txt')])
        })
        expect(result.current.files.length).toBe(1)
    })

    it('callback is invoked for each file', async () => {
        const cb = vi.fn(async () => true)
        const { result } = renderHook(() =>
            useUpupUpload({
                provider: 'S3' as const,
                onBeforeFileAdded: cb,
            }),
        )
        await act(async () => {
            await result.current.addFiles([
                makeFile('a.txt'),
                makeFile('b.txt'),
                makeFile('c.txt'),
            ])
        })
        expect(cb).toHaveBeenCalledTimes(3)
    })
})

describe('useUpupUpload — combined options', () => {
    it('works with multiple restrictions + onBeforeFileAdded', async () => {
        const cb = vi.fn(async () => true)
        const { result } = renderHook(() =>
            useUpupUpload({
                provider: 'S3' as const,
                allowedFileTypes: 'text/plain',
                maxFileSize: { size: 100, unit: 'B' },
                limit: 5,
                onBeforeFileAdded: cb,
            }),
        )
        await act(async () => {
            await result.current.addFiles([
                makeFile('ok.txt', 10, 'text/plain'),
            ])
        })
        expect(result.current.files.length).toBe(1)
        expect(cb).toHaveBeenCalledTimes(1)
    })
})
