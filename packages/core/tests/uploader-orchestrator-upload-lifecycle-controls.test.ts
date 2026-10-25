import { describe, it, expect, vi } from 'vitest'
import { UploaderOrchestrator } from '../src/orchestrator/uploader-orchestrator'
import {
    createMockCore,
    setOrchState,
    createUploadFile,
} from './helpers/uploader-orchestrator-fixtures'

describe('UploaderOrchestrator', () => {
    // ── Upload control methods ────────────────────────────────────────

    describe('startUpload', () => {
        it('calls core.upload() and returns result', async () => {
            const core = createMockCore()
            const mockFiles = [createUploadFile({ name: 'a.txt' })]
            vi.mocked(core.upload).mockResolvedValue(mockFiles)
            const orch = new UploaderOrchestrator(core, {})
            setOrchState(orch, {
                files: new Map([
                    ['f1', createUploadFile({ name: 'a.txt', id: 'f1' })],
                ]),
            })

            const result = await orch.startUpload()

            expect(core.upload).toHaveBeenCalled()
            expect(result).toEqual(mockFiles)
        })

        it('returns undefined when no files', async () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})

            const result = await orch.startUpload()

            expect(result).toBeUndefined()
            expect(core.upload).not.toHaveBeenCalled()
        })

        it('clears uploadError before uploading', async () => {
            const core = createMockCore()
            vi.mocked(core.upload).mockResolvedValue([])
            const orch = new UploaderOrchestrator(core, {})
            setOrchState(orch, {
                files: new Map([
                    ['f1', createUploadFile({ name: 'a.txt', id: 'f1' })],
                ]),
            })
            await orch.startUpload()

            expect(orch.getSnapshot().uploadError).toBe('')
        })

        it('clears uploadErrorCode before uploading (P4/C9)', async () => {
            const core = createMockCore()
            vi.mocked(core.upload).mockResolvedValue([])
            const orch = new UploaderOrchestrator(core, {})
            setOrchState(orch, {
                files: new Map([
                    ['f1', createUploadFile({ name: 'a.txt', id: 'f1' })],
                ]),
                uploadErrorCode: 'SignatureDoesNotMatch',
            })
            await orch.startUpload()

            expect(orch.getSnapshot().uploadErrorCode).toBeUndefined()
        })

        it('calls onPrepareFiles callback if provided', async () => {
            const core = createMockCore()
            vi.mocked(core.upload).mockResolvedValue([])
            vi.mocked(core.addFiles).mockResolvedValue(undefined)
            const prepared = [new File(['prepared'], 'prepared.txt')]
            const onPrepareFiles = vi.fn().mockResolvedValue(prepared)
            const orch = new UploaderOrchestrator(core, { onPrepareFiles })
            setOrchState(orch, {
                files: new Map([
                    ['f1', createUploadFile({ name: 'a.txt', id: 'f1' })],
                ]),
            })

            await orch.startUpload()

            expect(onPrepareFiles).toHaveBeenCalledTimes(1)
            expect(core.removeAll).toHaveBeenCalled()
            expect(core.addFiles).toHaveBeenCalledWith(prepared)
        })

        it('does not replace files if onPrepareFiles returns same array', async () => {
            const core = createMockCore()
            vi.mocked(core.upload).mockResolvedValue([])
            const orch = new UploaderOrchestrator(core, {
                onPrepareFiles: files => files,
            })
            setOrchState(orch, {
                files: new Map([
                    ['f1', createUploadFile({ name: 'a.txt', id: 'f1' })],
                ]),
            })

            await orch.startUpload()

            expect(core.removeAll).not.toHaveBeenCalled()
            expect(core.addFiles).not.toHaveBeenCalled()
        })
    })

    describe('retryUpload', () => {
        it('calls core.retry() with no arg for retry-all', async () => {
            const core = createMockCore()
            const mockFiles = [createUploadFile({ name: 'a.txt' })]
            vi.mocked(core.retry).mockResolvedValue(mockFiles)
            const orch = new UploaderOrchestrator(core, {})
            setOrchState(orch, {
                files: new Map([
                    ['f1', createUploadFile({ name: 'a.txt', id: 'f1' })],
                ]),
            })

            const result = await orch.retryUpload()

            expect(core.retry).toHaveBeenCalledWith(undefined)
            expect(result).toEqual(mockFiles)
        })

        it('calls core.retry(fileId) for single-file retry', async () => {
            const core = createMockCore()
            vi.mocked(core.retry).mockResolvedValue([])
            const orch = new UploaderOrchestrator(core, {})
            setOrchState(orch, {
                files: new Map([
                    ['f1', createUploadFile({ name: 'a.txt', id: 'f1' })],
                ]),
            })

            await orch.retryUpload('file-123')

            expect(core.retry).toHaveBeenCalledWith('file-123')
        })

        it('returns undefined when no files', async () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})

            const result = await orch.retryUpload()

            expect(result).toBeUndefined()
            expect(core.retry).not.toHaveBeenCalled()
        })

        it('clears uploadError before retrying', async () => {
            const core = createMockCore()
            vi.mocked(core.retry).mockResolvedValue([])
            const orch = new UploaderOrchestrator(core, {})
            setOrchState(orch, {
                files: new Map([
                    ['f1', createUploadFile({ name: 'a.txt', id: 'f1' })],
                ]),
            })

            await orch.retryUpload()

            expect(orch.getSnapshot().uploadError).toBe('')
        })

        it('clears uploadErrorCode before retrying (P4/C9)', async () => {
            const core = createMockCore()
            vi.mocked(core.retry).mockResolvedValue([])
            const orch = new UploaderOrchestrator(core, {})
            setOrchState(orch, {
                files: new Map([
                    ['f1', createUploadFile({ name: 'a.txt', id: 'f1' })],
                ]),
                uploadErrorCode: 'bad_signature',
            })

            await orch.retryUpload()

            expect(orch.getSnapshot().uploadErrorCode).toBeUndefined()
        })
    })

    describe('handleCancel', () => {
        it('calls core.cancel() and core.removeAll()', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})

            orch.handleCancel()

            expect(core.cancel).toHaveBeenCalled()
            expect(core.removeAll).toHaveBeenCalled()
        })

        it('revokes blob URLs for all files', () => {
            const core = createMockCore()
            const revokeObjectURL = vi.fn()
            vi.stubGlobal('URL', {
                ...globalThis.URL,
                createObjectURL: () => 'blob:http://localhost/cancel',
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
                            url: 'blob:http://localhost/cancel',
                        }),
                    ],
                    [
                        'f2',
                        createUploadFile({
                            name: 'b.txt',
                            id: 'f2',
                            url: 'blob:http://localhost/cancel',
                        }),
                    ],
                ]),
            })

            orch.handleCancel()

            expect(revokeObjectURL).toHaveBeenCalledTimes(2)
            vi.unstubAllGlobals()
        })

        it('resets progress-related state', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})

            orch.handleCancel()

            const state = orch.getSnapshot()
            expect(state.filesProgressMap).toEqual({})
            expect(state.uploadSpeed).toBe(0)
            expect(state.uploadEta).toBe(0)
            expect(state.uploadedBytes).toBe(0)
            expect(state.totalBytes).toBe(0)
        })

        it('notifies listeners', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})
            const listener = vi.fn()
            orch.subscribe(listener)

            orch.handleCancel()

            expect(listener).toHaveBeenCalled()
        })
    })

    describe('handlePause', () => {
        it('calls core.pause()', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})

            orch.handlePause()

            expect(core.pause).toHaveBeenCalled()
        })
    })

    describe('handleResume', () => {
        it('calls core.resume()', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})

            orch.handleResume()

            expect(core.resume).toHaveBeenCalled()
        })
    })

    describe('handleDone', () => {
        it('calls onDoneClicked callback', () => {
            const core = createMockCore()
            core.emit = vi.fn()
            const onDoneClicked = vi.fn()
            const orch = new UploaderOrchestrator(core, { onDoneClicked })

            orch.handleDone()

            expect(onDoneClicked).toHaveBeenCalledTimes(1)
        })

        it('emits done event on core', () => {
            const core = createMockCore()
            core.emit = vi.fn()
            const orch = new UploaderOrchestrator(core, {})

            orch.handleDone()

            expect(core.emit).toHaveBeenCalledWith('done', {})
        })

        it('calls handleCancel internally (cancel + removeAll)', () => {
            const core = createMockCore()
            core.emit = vi.fn()
            const orch = new UploaderOrchestrator(core, {})

            orch.handleDone()

            expect(core.cancel).toHaveBeenCalled()
            expect(core.removeAll).toHaveBeenCalled()
        })
    })

    describe('resetState', () => {
        it('sets isAddingMore to false', () => {
            const core = createMockCore()
            core.emit = vi.fn()
            const orch = new UploaderOrchestrator(core, {})
            orch.setIsAddingMore(true)

            orch.resetState()

            expect(orch.getSnapshot().isAddingMore).toBe(false)
        })

        it('emits state-reset event', () => {
            const core = createMockCore()
            core.emit = vi.fn()
            const orch = new UploaderOrchestrator(core, {})

            orch.resetState()

            expect(core.emit).toHaveBeenCalledWith('state-reset', {})
        })

        it('calls handleDone (which cancels and clears)', () => {
            const core = createMockCore()
            core.emit = vi.fn()
            const onDoneClicked = vi.fn()
            const orch = new UploaderOrchestrator(core, { onDoneClicked })

            orch.resetState()

            expect(onDoneClicked).toHaveBeenCalled()
            expect(core.cancel).toHaveBeenCalled()
            expect(core.removeAll).toHaveBeenCalled()
        })

        it('revokes blob URLs for all files', () => {
            const core = createMockCore()
            core.emit = vi.fn()
            const revokeObjectURL = vi.fn()
            vi.stubGlobal('URL', {
                ...globalThis.URL,
                createObjectURL: () => 'blob:http://localhost/reset',
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
                            url: 'blob:http://localhost/reset',
                        }),
                    ],
                ]),
            })

            orch.resetState()

            expect(revokeObjectURL).toHaveBeenCalled()
            vi.unstubAllGlobals()
        })

        it('resets progress-related state', () => {
            const core = createMockCore()
            core.emit = vi.fn()
            const orch = new UploaderOrchestrator(core, {})

            orch.resetState()

            const state = orch.getSnapshot()
            expect(state.filesProgressMap).toEqual({})
            expect(state.uploadSpeed).toBe(0)
            expect(state.uploadEta).toBe(0)
            expect(state.uploadedBytes).toBe(0)
            expect(state.totalBytes).toBe(0)
        })
    })
})
