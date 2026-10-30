import { describe, it, expect, vi } from 'vitest'
import { UploaderOrchestrator } from '../src/orchestrator/uploader-orchestrator'
import type { UploadFile } from '../src/types/upload-file'
import {
    createMockCore,
    setOrchState,
    createUploadFile,
} from './helpers/uploader-orchestrator-fixtures'

describe('UploaderOrchestrator', () => {
    // ── Image editor methods ─────────────────────────────────────────

    describe('openImageEditor', () => {
        it('sets editingFile in state', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})
            const file = createUploadFile({
                name: 'photo.png',
                type: 'image/png',
            })

            orch.openImageEditor(file)

            expect(orch.getSnapshot().editingFile).toBe(file)
        })

        it('invokes onOpen callback from imageEditorOptions', () => {
            const core = createMockCore()
            const onOpen = vi.fn()
            const orch = new UploaderOrchestrator(core, {
                imageEditorOptions: {
                    enabled: true,
                    autoOpen: 'never',
                    display: 'inline',
                    onOpen,
                },
            })
            const file = createUploadFile({
                name: 'photo.png',
                type: 'image/png',
            })

            orch.openImageEditor(file)

            expect(onOpen).toHaveBeenCalledWith(file)
        })

        it('emits image-editor-open event on core', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})
            const file = createUploadFile({
                name: 'photo.png',
                type: 'image/png',
            })

            orch.openImageEditor(file)

            expect(core.emit).toHaveBeenCalledWith('image-editor-open', {
                file,
            })
        })

        it('notifies listeners', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})
            const listener = vi.fn()
            orch.subscribe(listener)

            orch.openImageEditor(
                createUploadFile({ name: 'photo.png', type: 'image/png' }),
            )

            expect(listener).toHaveBeenCalled()
        })
    })

    describe('closeImageEditor', () => {
        it('clears editingFile in state', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})
            const file = createUploadFile({
                name: 'photo.png',
                type: 'image/png',
            })
            orch.openImageEditor(file)

            orch.closeImageEditor()

            expect(orch.getSnapshot().editingFile).toBeNull()
        })

        it('invokes onCancel callback with the file that was being edited', () => {
            const core = createMockCore()
            const onCancel = vi.fn()
            const orch = new UploaderOrchestrator(core, {
                imageEditorOptions: {
                    enabled: true,
                    autoOpen: 'never',
                    display: 'inline',
                    onCancel,
                },
            })
            const file = createUploadFile({
                name: 'photo.png',
                type: 'image/png',
            })
            orch.openImageEditor(file)

            orch.closeImageEditor()

            expect(onCancel).toHaveBeenCalledWith(file)
        })

        it('emits image-editor-cancel event on core', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})
            const file = createUploadFile({
                name: 'photo.png',
                type: 'image/png',
            })
            orch.openImageEditor(file)

            orch.closeImageEditor()

            expect(core.emit).toHaveBeenCalledWith('image-editor-cancel', {
                file,
            })
        })

        it('does not invoke onCancel when no file was being edited', () => {
            const core = createMockCore()
            const onCancel = vi.fn()
            const orch = new UploaderOrchestrator(core, {
                imageEditorOptions: {
                    enabled: true,
                    autoOpen: 'never',
                    display: 'inline',
                    onCancel,
                },
            })

            orch.closeImageEditor()

            expect(onCancel).not.toHaveBeenCalled()
        })

        it('auto-opens next file from editor queue', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})
            const file1 = createUploadFile({
                name: 'a.png',
                id: 'a',
                type: 'image/png',
            })
            const file2 = createUploadFile({
                name: 'b.png',
                id: 'b',
                type: 'image/png',
            })

            // Open first file, enqueue second
            orch.openImageEditor(file1)
            orch.enqueueForEditor([file2])

            // Close first -> should auto-open second
            orch.closeImageEditor()

            expect(orch.getSnapshot().editingFile).toBe(file2)
            expect(orch.getSnapshot().editorQueue).toEqual([])
        })
    })

    describe('saveImageEdit', () => {
        it('does nothing when no file is being edited', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})

            orch.saveImageEdit('data:image/png;base64,iVBORw0KGgo=')

            expect(core.replaceFile).not.toHaveBeenCalled()
        })

        it('replaces the file with edited version and clears editingFile', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})
            const file = createUploadFile({
                name: 'photo.png',
                id: 'photo-1',
                type: 'image/png',
            })

            // Add the file to state so revokeAndReplace can find it
            const filesMap = new Map<string, UploadFile>()
            filesMap.set('photo-1', file)
            // Seed files via addFiles workaround -- use openImageEditor to set editing
            orch.openImageEditor(file)

            // Use a minimal valid data URL
            orch.saveImageEdit('data:image/png;base64,iVBORw0KGgo=')

            expect(orch.getSnapshot().editingFile).toBeNull()
            expect(core.replaceFile).toHaveBeenCalledTimes(1)
            expect(core.replaceFile).toHaveBeenCalledWith(
                'photo-1',
                expect.any(Object),
            )
        })

        it('invokes onSave callback with edited and original file', () => {
            const core = createMockCore()
            const onSave = vi.fn()
            const orch = new UploaderOrchestrator(core, {
                imageEditorOptions: {
                    enabled: true,
                    autoOpen: 'never',
                    display: 'inline',
                    onSave,
                },
            })
            const file = createUploadFile({
                name: 'photo.png',
                id: 'photo-1',
                type: 'image/png',
            })
            orch.openImageEditor(file)

            orch.saveImageEdit('data:image/png;base64,iVBORw0KGgo=')

            expect(onSave).toHaveBeenCalledTimes(1)
            expect(onSave).toHaveBeenCalledWith(expect.any(Object), file)
        })

        it('emits image-editor-save event', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})
            const file = createUploadFile({
                name: 'photo.png',
                id: 'photo-1',
                type: 'image/png',
            })
            orch.openImageEditor(file)

            orch.saveImageEdit('data:image/png;base64,iVBORw0KGgo=')

            expect(core.emit).toHaveBeenCalledWith('image-editor-save', {
                file: expect.any(Object),
                original: file,
            })
        })

        it('uses mimeType parameter when provided', () => {
            const core = createMockCore()
            const onSave = vi.fn()
            const orch = new UploaderOrchestrator(core, {
                imageEditorOptions: {
                    enabled: true,
                    autoOpen: 'never',
                    display: 'inline',
                    onSave,
                },
            })
            const file = createUploadFile({
                name: 'photo.png',
                id: 'photo-1',
                type: 'image/png',
            })
            orch.openImageEditor(file)

            orch.saveImageEdit(
                'data:image/png;base64,iVBORw0KGgo=',
                'image/webp',
            )

            // The new file passed to onSave should have the requested MIME type
            const newFile = onSave.mock.calls[0]![0] as UploadFile
            expect(newFile.type).toBe('image/webp')
        })

        it('processes editor queue after saving', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})
            const file1 = createUploadFile({
                name: 'a.png',
                id: 'a',
                type: 'image/png',
            })
            const file2 = createUploadFile({
                name: 'b.png',
                id: 'b',
                type: 'image/png',
            })

            orch.openImageEditor(file1)
            orch.enqueueForEditor([file2])

            orch.saveImageEdit('data:image/png;base64,iVBORw0KGgo=')

            // After saving, next queued file should auto-open
            expect(orch.getSnapshot().editingFile).toBe(file2)
            expect(orch.getSnapshot().editorQueue).toEqual([])
        })
    })

    describe('replaceFile', () => {
        it('replaces a file in state by id', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})
            const original = createUploadFile({
                name: 'original.txt',
                id: 'file-1',
            })
            setOrchState(orch, { files: new Map([['file-1', original]]) })

            const replacement = createUploadFile({
                name: 'replacement.txt',
                id: 'file-1',
            })
            orch.replaceFile('file-1', replacement)

            expect(orch.getSnapshot().files.get('file-1')?.name).toBe(
                'replacement.txt',
            )
        })

        it('calls core.replaceFile', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})
            const original = createUploadFile({
                name: 'original.txt',
                id: 'file-1',
            })
            setOrchState(orch, { files: new Map([['file-1', original]]) })

            const replacement = createUploadFile({
                name: 'replacement.txt',
                id: 'file-1',
            })
            orch.replaceFile('file-1', replacement)

            expect(core.replaceFile).toHaveBeenCalledWith('file-1', replacement)
        })

        it('revokes old blob URL', () => {
            const core = createMockCore()
            const revokeObjectURL = vi.fn()
            vi.stubGlobal('URL', {
                ...globalThis.URL,
                createObjectURL: () => 'blob:http://localhost/old',
                revokeObjectURL,
            })

            const orch = new UploaderOrchestrator(core, {})
            const original = createUploadFile({
                name: 'original.txt',
                id: 'file-1',
                url: 'blob:http://localhost/old',
            })
            setOrchState(orch, { files: new Map([['file-1', original]]) })

            const replacement = createUploadFile({
                name: 'replacement.txt',
                id: 'file-1',
            })
            orch.replaceFile('file-1', replacement)

            expect(revokeObjectURL).toHaveBeenCalledWith(
                'blob:http://localhost/old',
            )
            vi.unstubAllGlobals()
        })

        it('notifies listeners', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})
            const original = createUploadFile({
                name: 'original.txt',
                id: 'file-1',
            })
            setOrchState(orch, { files: new Map([['file-1', original]]) })

            const listener = vi.fn()
            orch.subscribe(listener)

            const replacement = createUploadFile({
                name: 'replacement.txt',
                id: 'file-1',
            })
            orch.replaceFile('file-1', replacement)

            expect(listener).toHaveBeenCalled()
        })
    })

    describe('enqueueForEditor', () => {
        it('adds files to the editor queue', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})
            const file1 = createUploadFile({
                name: 'a.png',
                id: 'a',
                type: 'image/png',
            })
            const file2 = createUploadFile({
                name: 'b.png',
                id: 'b',
                type: 'image/png',
            })

            // Must have something editing so queue isn't immediately processed
            orch.openImageEditor(
                createUploadFile({
                    name: 'current.png',
                    id: 'current',
                    type: 'image/png',
                }),
            )
            orch.enqueueForEditor([file1, file2])

            expect(orch.getSnapshot().editorQueue).toEqual([file1, file2])
        })

        it('does nothing for empty array', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})
            const listener = vi.fn()
            orch.subscribe(listener)

            orch.enqueueForEditor([])

            expect(listener).not.toHaveBeenCalled()
        })

        it('auto-opens first file if nothing is being edited', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})
            const file1 = createUploadFile({
                name: 'a.png',
                id: 'a',
                type: 'image/png',
            })
            const file2 = createUploadFile({
                name: 'b.png',
                id: 'b',
                type: 'image/png',
            })

            orch.enqueueForEditor([file1, file2])

            // First file should be auto-opened, second stays in queue
            expect(orch.getSnapshot().editingFile).toBe(file1)
            expect(orch.getSnapshot().editorQueue).toEqual([file2])
        })

        it('appends to existing queue', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})
            const file1 = createUploadFile({
                name: 'a.png',
                id: 'a',
                type: 'image/png',
            })
            const file2 = createUploadFile({
                name: 'b.png',
                id: 'b',
                type: 'image/png',
            })
            const file3 = createUploadFile({
                name: 'c.png',
                id: 'c',
                type: 'image/png',
            })

            orch.openImageEditor(
                createUploadFile({
                    name: 'current.png',
                    id: 'current',
                    type: 'image/png',
                }),
            )
            orch.enqueueForEditor([file1])
            orch.enqueueForEditor([file2, file3])

            expect(orch.getSnapshot().editorQueue).toEqual([
                file1,
                file2,
                file3,
            ])
        })
    })

    describe('editor queue integration', () => {
        it('processes entire queue sequentially via close', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})
            const files = [
                createUploadFile({ name: 'a.png', id: 'a', type: 'image/png' }),
                createUploadFile({ name: 'b.png', id: 'b', type: 'image/png' }),
                createUploadFile({ name: 'c.png', id: 'c', type: 'image/png' }),
            ]

            orch.enqueueForEditor(files)

            // First should be open
            expect(orch.getSnapshot().editingFile?.id).toBe('a')

            orch.closeImageEditor()
            expect(orch.getSnapshot().editingFile?.id).toBe('b')

            orch.closeImageEditor()
            expect(orch.getSnapshot().editingFile?.id).toBe('c')

            orch.closeImageEditor()
            expect(orch.getSnapshot().editingFile).toBeNull()
            expect(orch.getSnapshot().editorQueue).toEqual([])
        })

        it('processes queue after save (not just close)', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})
            const files = [
                createUploadFile({ name: 'a.png', id: 'a', type: 'image/png' }),
                createUploadFile({ name: 'b.png', id: 'b', type: 'image/png' }),
            ]

            orch.enqueueForEditor(files)
            expect(orch.getSnapshot().editingFile?.id).toBe('a')

            orch.saveImageEdit('data:image/png;base64,iVBORw0KGgo=')
            expect(orch.getSnapshot().editingFile?.id).toBe('b')
        })
    })
})
