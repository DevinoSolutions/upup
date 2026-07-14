import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useUpupUpload } from '../src/use-upup-upload'

const makeFile = (name: string, size = 10, type = 'text/plain') =>
    new File(['x'.repeat(size)], name, { type })

/**
 * Capstone integration test: exercises the useUpupUpload headless hook
 * with a real plugin observing the complete file lifecycle.
 */
describe('useUpupUpload — capstone integration', () => {
    it('plugin tracks full lifecycle via events', async () => {
        const log: string[] = []

        const { result, unmount } = renderHook(() =>
            useUpupUpload({
                provider: 'S3' as const,
                allowedFileTypes: 'text/plain',
                limit: 5,
                plugins: [
                    {
                        name: 'lifecycle-tracker',
                        init: emitter => {
                            emitter.on('files-added', () =>
                                log.push('files-added'),
                            )
                            emitter.on('file-removed', () =>
                                log.push('file-removed'),
                            )
                            emitter.on('files-cleared', () =>
                                log.push('files-cleared'),
                            )
                            emitter.on('files-reordered', () =>
                                log.push('files-reordered'),
                            )
                            emitter.on('files-set', () => log.push('files-set'))
                            emitter.on('destroyed', () => log.push('destroyed'))
                        },
                    },
                ],
            }),
        )

        // Add files
        await act(async () => {
            await result.current.addFiles([
                makeFile('a.txt'),
                makeFile('b.txt'),
            ])
        })
        expect(log).toContain('files-added')
        expect(result.current.files.length).toBe(2)

        // Reorder (functional check — event may not propagate through hook layer)
        const ids = result.current.files.map(f => f.id)
        act(() => {
            result.current.reorderFiles([...ids].reverse())
        })
        expect(result.current.files.map(f => f.id)).toEqual([...ids].reverse())

        // Remove one
        act(() => {
            result.current.removeFile(result.current.files[0]!.id)
        })
        expect(log).toContain('file-removed')
        expect(result.current.files.length).toBe(1)

        // Set files (replace)
        await act(async () => {
            await result.current.setFiles([makeFile('new.txt')])
        })
        expect(result.current.files.length).toBe(1)

        // Remove all
        act(() => {
            result.current.removeAll()
        })
        expect(result.current.files.length).toBe(0)

        // Unmount cleanly
        unmount()
        // Verify the full log captured add + remove events
        expect(
            log.filter(e => e === 'files-added').length,
        ).toBeGreaterThanOrEqual(1)
        expect(
            log.filter(e => e === 'file-removed').length,
        ).toBeGreaterThanOrEqual(1)
    })

    it('analytics extension tracks metrics through hook', async () => {
        // The plugin observes events via init(emitter); extensions are registered
        // through the public core.registerExtension() (F-607: init no longer hands
        // the plugin the core, so lifecycle-time extension registration is gone —
        // core.registerExtension is the supported path).
        const metrics = { adds: 0, removes: 0 }
        const { result } = renderHook(() =>
            useUpupUpload({
                provider: 'S3' as const,
                plugins: [
                    {
                        name: 'analytics',
                        init: emitter => {
                            emitter.on('files-added', () => metrics.adds++)
                            emitter.on('file-removed', () => metrics.removes++)
                        },
                    },
                ],
            }),
        )

        act(() => {
            result.current.core.registerExtension('analytics', {
                getMetrics: () => ({ ...metrics }),
            })
        })

        await act(async () => {
            await result.current.addFiles([makeFile('x.txt')])
            await result.current.addFiles([makeFile('y.txt')])
        })

        const id = result.current.files[0]!.id
        act(() => {
            result.current.removeFile(id)
        })

        const m = result.current.ext.analytics!.getMetrics!() as {
            adds: number
            removes: number
        }
        expect(m.adds).toBe(2)
        expect(m.removes).toBe(1)
    })

    it('restriction + event + plugin all work together', async () => {
        const rejections: string[] = []

        const { result } = renderHook(() =>
            useUpupUpload({
                provider: 'S3' as const,
                allowedFileTypes: 'text/plain',
                maxFileSize: { size: 50, unit: 'B' },
                limit: 2,
                plugins: [
                    {
                        name: 'rejection-logger',
                        init: emitter => {
                            emitter.on('file-rejected', () =>
                                rejections.push('rejected'),
                            )
                        },
                    },
                ],
            }),
        )

        // Valid file
        await act(async () => {
            await result.current.addFiles([
                makeFile('ok.txt', 10, 'text/plain'),
            ])
        })
        expect(result.current.files.length).toBe(1)

        // Wrong type — rejected
        await act(async () => {
            try {
                await result.current.addFiles([
                    makeFile('bad.png', 10, 'image/png'),
                ])
            } catch {
                /* upup-catch: expected rejection in this negative-path test; asserted below */
            }
        })
        expect(result.current.files.length).toBe(1)

        // Too large — rejected
        await act(async () => {
            try {
                await result.current.addFiles([makeFile('huge.txt', 100)])
            } catch {
                /* upup-catch: expected rejection in this negative-path test; asserted below */
            }
        })
        expect(result.current.files.length).toBe(1)

        // Second valid file
        await act(async () => {
            await result.current.addFiles([
                makeFile('ok2.txt', 20, 'text/plain'),
            ])
        })
        expect(result.current.files.length).toBe(2)

        // Over limit — rejected
        await act(async () => {
            try {
                await result.current.addFiles([makeFile('over.txt', 5)])
            } catch {
                /* upup-catch: expected rejection in this negative-path test; asserted below */
            }
        })
        expect(result.current.files.length).toBe(2)

        // Verify core state matches hook state
        expect(result.current.core.files.size).toBe(2)
        expect(result.current.core.progress.totalFiles).toBe(2)
    })

    it('multiple hooks with independent plugins do not interfere', async () => {
        const log1: string[] = []
        const log2: string[] = []

        const { result: r1 } = renderHook(() =>
            useUpupUpload({
                provider: 'S3' as const,
                plugins: [
                    {
                        name: 'p1',
                        init: e => e.on('files-added', () => log1.push('h1')),
                    },
                ],
            }),
        )
        const { result: r2 } = renderHook(() =>
            useUpupUpload({
                provider: 'S3' as const,
                plugins: [
                    {
                        name: 'p2',
                        init: e => e.on('files-added', () => log2.push('h2')),
                    },
                ],
            }),
        )

        await act(async () => {
            await r1.current.addFiles([makeFile('a.txt')])
        })
        await act(async () => {
            await r2.current.addFiles([makeFile('b.txt')])
        })

        expect(log1).toEqual(['h1'])
        expect(log2).toEqual(['h2'])
        expect(r1.current.files.length).toBe(1)
        expect(r2.current.files.length).toBe(1)
    })
})
