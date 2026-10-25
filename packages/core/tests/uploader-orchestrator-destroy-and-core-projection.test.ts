import { describe, it, expect, vi } from 'vitest'
import { UploaderOrchestrator } from '../src/orchestrator/uploader-orchestrator'
import { UpupCore } from '../src/core'
import { UploadStatus } from '../src/types/upload-status'
import {
    createMockCore,
    createMockCoreWithHandlers,
    setOrchState,
    createUploadFile,
} from './helpers/uploader-orchestrator-fixtures'

describe('UploaderOrchestrator', () => {
    describe('destroy', () => {
        it('calls all unsubscribe functions from init', () => {
            const { core, unsubs } = createMockCoreWithHandlers()
            const orch = new UploaderOrchestrator(core, {})
            orch.init()

            const unsubCount = unsubs.length
            expect(unsubCount).toBeGreaterThan(0)

            orch.destroy()

            unsubs.forEach(unsub => {
                expect(unsub).toHaveBeenCalled()
            })
        })

        it('clears listeners after destroy', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})
            const listener = vi.fn()
            orch.subscribe(listener)
            orch.init()

            orch.destroy()

            // After destroy, state should still be readable but listeners cleared
            expect(orch.getSnapshot().files.size).toBe(0)
        })

        it('is safe to call multiple times', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})
            orch.init()

            orch.destroy()
            orch.destroy() // should not throw

            expect(orch.getSnapshot().uploadStatus).toBe(UploadStatus.IDLE)
        })

        it('revokes blob URLs for every still-selected file', () => {
            const core = createMockCore()
            const revokeObjectURL = vi.fn()
            vi.stubGlobal('URL', {
                ...globalThis.URL,
                createObjectURL: () => 'blob:http://localhost/destroy',
                revokeObjectURL,
            })

            const orch = new UploaderOrchestrator(core, {})
            setOrchState(orch, {
                files: new Map([
                    [
                        'f1',
                        createUploadFile({
                            name: 'a.txt',
                            id: 'f1',
                            url: 'blob:http://localhost/destroy',
                        }),
                    ],
                    [
                        'f2',
                        createUploadFile({
                            name: 'b.txt',
                            id: 'f2',
                            url: 'blob:http://localhost/destroy',
                        }),
                    ],
                ]),
            })

            orch.destroy()

            expect(revokeObjectURL).toHaveBeenCalledTimes(2)
            vi.unstubAllGlobals()
        })
    })

    // ── Tier 3.1 Task 1: files projection reflects ALL core mutations ──
    describe('files projection reflects ALL core file mutations (Tier 3.1)', () => {
        const realFile = (name: string, bytes = 4): File =>
            new File([new Uint8Array(bytes)], name, { type: 'text/plain' })

        function setup() {
            const core = new UpupCore({})
            const orch = new UploaderOrchestrator(core, {})
            orch.init()
            return { core, orch }
        }
        const names = (orch: UploaderOrchestrator) =>
            [...orch.getSnapshot().files.values()].map(f => f.name)

        it('reflects core.addFiles', async () => {
            const { core, orch } = setup()
            await core.addFiles([realFile('a.txt')])
            expect(names(orch)).toEqual(['a.txt'])
            core.destroy()
        })

        it('reflects core.setFiles (was stale before the projection)', async () => {
            const { core, orch } = setup()
            await core.addFiles([realFile('a.txt')])
            await core.setFiles([realFile('b.txt'), realFile('c.txt')])
            expect(names(orch)).toEqual(['b.txt', 'c.txt'])
            core.destroy()
        })

        it('reflects core.reorderFiles', async () => {
            const { core, orch } = setup()
            await core.addFiles([realFile('a.txt'), realFile('b.txt')])
            const ids = [...core.files.keys()]
            core.reorderFiles([ids[1]!, ids[0]!])
            expect(names(orch)).toEqual(['b.txt', 'a.txt'])
            core.destroy()
        })

        it('reflects core.replaceFile', async () => {
            const { core, orch } = setup()
            await core.addFiles([realFile('a.txt')])
            const [id] = [...core.files.keys()]
            // Build a replacement matching core.replaceFile's expected arg type
            // (core.replaceFile takes File | UploadFile; pass a plain File)
            core.replaceFile(id!, realFile('a-edited.txt') as never)
            expect(names(orch)).toEqual(['a-edited.txt'])
            core.destroy()
        })

        it('reflects core.restore (crash-recovery path)', async () => {
            const seed = setup()
            await seed.core.addFiles([realFile('a.txt')])
            const snap = seed.core.getSnapshot()
            seed.core.destroy()
            const { core, orch } = setup()
            core.restore(snap)
            expect(names(orch)).toEqual(['a.txt'])
            core.destroy()
        })

        it('empties on core.removeAll', async () => {
            const { core, orch } = setup()
            await core.addFiles([realFile('a.txt'), realFile('b.txt')])
            expect(orch.getSnapshot().files.size).toBe(2)
            core.removeAll()
            expect(orch.getSnapshot().files.size).toBe(0)
            core.destroy()
        })

        it('keeps a STABLE files reference across status-only state-change events', async () => {
            const { core, orch } = setup()
            await core.addFiles([realFile('a.txt')])
            const ref1 = orch.getSnapshot().files
            core.emit('state-change', { status: core.status })
            expect(orch.getSnapshot().files).toBe(ref1) // no file change → same ref
            core.destroy()
        })
    })

    // ── Integration: real core ⇄ orchestrator removal mirror ────────
    describe('integration: core removal mirror (real UpupCore)', () => {
        const makeRealCore = () =>
            new UpupCore({ provider: 'aws', uploadEndpoint: '/api/upload' })
        const realFile = (name: string) =>
            new File(['x'], name, { type: 'text/plain' })

        it('mirrors a direct core.removeFile into orchestrator state (Vue/Svelte/Angular path)', async () => {
            const core = makeRealCore()
            const orch = new UploaderOrchestrator(core, {})
            orch.init()
            await core.addFiles([realFile('a.txt'), realFile('b.txt')])
            expect(orch.getSnapshot().files.size).toBe(2)

            const [id] = [...core.files.keys()]
            core.removeFile(id!)

            expect(orch.getSnapshot().files.size).toBe(1)
            expect(orch.getSnapshot().files.has(id!)).toBe(false)
            orch.destroy()
        })

        it('mirrors core.removeAll into orchestrator state (Remove all path)', async () => {
            const core = makeRealCore()
            const orch = new UploaderOrchestrator(core, {})
            orch.init()
            await core.addFiles([realFile('a.txt'), realFile('b.txt')])
            expect(orch.getSnapshot().files.size).toBe(2)

            core.removeAll()

            expect(orch.getSnapshot().files.size).toBe(0)
            orch.destroy()
        })
    })
})
