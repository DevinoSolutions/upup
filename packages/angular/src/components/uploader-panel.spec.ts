/**
 * uploader-panel.spec.ts — TestBed tests for UploaderPanelComponent.
 *
 * Covers:
 *   - dropzone testid + slot render
 *   - FileList always present
 *   - SourceSelector shown when no active adapter + no files / adding more
 *   - SourceSelector hidden when adapter is active
 *   - SourceView shown when adapter is active
 *   - Offline banner appears when isOnline=false
 *   - handleDrop with stubbed DataTransfer calls store.handleSetSelectedFiles + emits 'drop'
 *   - disableDragDrop suppresses drag handlers (handleSetSelectedFiles NOT called, isDragging stays false)
 *   - active adapter suppresses drag action
 *   - handlePaste with clipboard files calls handleSetSelectedFiles + emits 'paste'
 */
import { describe, it, expect, afterEach, vi } from 'vitest'
import { TestBed } from '@angular/core/testing'
import { signal } from '@angular/core'
import { FileSource } from '@upup/core'
import type { UploaderProps } from '../shared/types'
import { UpupStore } from '../upup-store.service'
import { UploaderPanelComponent } from './uploader-panel.component'

// ── Helpers ────────────────────────────────────────────────────────────────

/** Create + init a real UpupStore. */
function makeStore(): UpupStore {
    const store = new UpupStore()
    store.setConfig({} as unknown as UploaderProps)
    store.init()
    return store
}

async function setup(store: UpupStore) {
    await TestBed.configureTestingModule({
        imports: [UploaderPanelComponent],
        providers: [{ provide: UpupStore, useValue: store }],
    }).compileComponents()

    const fixture = TestBed.createComponent(UploaderPanelComponent)
    fixture.detectChanges()
    return fixture
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('UploaderPanelComponent', () => {
    let store: UpupStore

    afterEach(() => {
        store?.destroy()
        TestBed.resetTestingModule()
    })

    // ── Structural ──────────────────────────────────────────────────────────

    it('renders the dropzone with correct testid and slot', async () => {
        store = makeStore()
        const fixture = await setup(store)
        const el: HTMLElement = fixture.nativeElement
        const dropzone = el.querySelector('[data-testid="upup-dropzone"]')
        expect(dropzone).not.toBeNull()
        expect(dropzone?.getAttribute('data-upup-slot')).toBe('uploader-panel')
    })

    it('always renders upup-file-list', async () => {
        store = makeStore()
        const fixture = await setup(store)
        const el: HTMLElement = fixture.nativeElement
        expect(el.querySelector('upup-file-list')).not.toBeNull()
    })

    it('renders the header only inside file-list, never as a stray top-level header (regression: duplicate visible header when empty)', async () => {
        store = makeStore()
        const fixture = await setup(store)
        const el: HTMLElement = fixture.nativeElement
        // React/Svelte render UploaderHeader ONLY inside FileList (which is
        // hidden via `upup-hidden` when there are no files). A stray header at
        // the UploaderPanel root would always be visible and show a phantom
        // "files selected" band in the empty state.
        const headers = el.querySelectorAll('upup-uploader-header')
        expect(headers.length).toBe(1)
        expect(headers[0]!.closest('upup-file-list')).not.toBeNull()
    })

    it('shows SourceSelector when no active adapter and no files', async () => {
        store = makeStore()
        const fixture = await setup(store)
        const el: HTMLElement = fixture.nativeElement
        // No adapter, no files → selector visible
        expect(el.querySelector('upup-source-selector')).not.toBeNull()
    })

    it('hides SourceSelector when an adapter is active', async () => {
        store = makeStore()
        const fixture = await setup(store)
        // Set active adapter
        store.setActiveSource(FileSource.GOOGLE_DRIVE)
        fixture.detectChanges()
        const el: HTMLElement = fixture.nativeElement
        expect(el.querySelector('upup-source-selector')).toBeNull()
    })

    it('shows SourceView when an adapter is active', async () => {
        store = makeStore()
        const fixture = await setup(store)
        store.setActiveSource(FileSource.GOOGLE_DRIVE)
        fixture.detectChanges()
        const el: HTMLElement = fixture.nativeElement
        expect(el.querySelector('upup-source-view')).not.toBeNull()
    })

    it('hides SourceView when no adapter is active', async () => {
        store = makeStore()
        const fixture = await setup(store)
        const el: HTMLElement = fixture.nativeElement
        expect(el.querySelector('upup-source-view')).toBeNull()
    })

    it('shows offline banner when isOnline=false', async () => {
        store = makeStore()
        const fixture = await setup(store)
        // Override isOnline signal to return false
        store.isOnline = signal(false)
        fixture.detectChanges()
        const el: HTMLElement = fixture.nativeElement
        const banner = el.querySelector('[class*="upup-bg-yellow"]')
        expect(banner).not.toBeNull()
        expect(banner?.textContent).toContain('No internet connection')
    })

    // ── Drag / Drop ─────────────────────────────────────────────────────────

    it('handleDrop calls store.handleSetSelectedFiles and emits drop event', async () => {
        store = makeStore()
        const fixture = await setup(store)
        const comp = fixture.componentInstance

        const handleSetSpy = vi
            .spyOn(store, 'handleSetSelectedFiles')
            .mockResolvedValue(undefined)
        const emitSpy = vi.spyOn(store.core, 'emit')

        const file = new File(['hello'], 'hello.txt', { type: 'text/plain' })
        // Stub DataTransfer with files (jsdom doesn't expose DragEvent constructor)
        const dt = { files: [file], items: [] } as unknown as DataTransfer
        const dropEvent = {
            type: 'drop',
            preventDefault: vi.fn(),
            dataTransfer: dt,
        } as unknown as DragEvent

        await comp.handleDrop(dropEvent)

        expect(handleSetSpy).toHaveBeenCalled()
        expect(emitSpy).toHaveBeenCalledWith('drop', expect.any(Object))
    })

    it('disableDragDrop suppresses drag handlers — handleSetSelectedFiles not called', async () => {
        // Must set disableDragDrop BEFORE init() so uiProps picks it up
        store = new UpupStore()
        store.setConfig({ disableDragDrop: true } as unknown as UploaderProps)
        store.init()
        const fixture = await setup(store)
        const comp = fixture.componentInstance

        const handleSetSpy = vi.spyOn(store, 'handleSetSelectedFiles')

        const file = new File(['x'], 'x.txt')
        const dt = { files: [file], items: [] } as unknown as DataTransfer

        const dragOverEvent = {
            type: 'dragover',
            preventDefault: vi.fn(),
            dataTransfer: dt,
        } as unknown as DragEvent

        comp.handleDragOver(dragOverEvent)
        expect(comp.isDragging()).toBe(false)

        const dropEvent = {
            type: 'drop',
            preventDefault: vi.fn(),
            dataTransfer: dt,
        } as unknown as DragEvent
        await comp.handleDrop(dropEvent)

        expect(handleSetSpy).not.toHaveBeenCalled()
    })

    it('active adapter suppresses drag action — isDragging stays false', async () => {
        store = makeStore()
        const fixture = await setup(store)
        const comp = fixture.componentInstance

        store.setActiveSource(FileSource.GOOGLE_DRIVE)
        fixture.detectChanges()

        const handleSetSpy = vi.spyOn(store, 'handleSetSelectedFiles')
        const dt = { files: [], items: [] } as unknown as DataTransfer
        const dragOverEvent = {
            type: 'dragover',
            preventDefault: vi.fn(),
            dataTransfer: dt,
        } as unknown as DragEvent

        comp.handleDragOver(dragOverEvent)
        expect(comp.isDragging()).toBe(false)
        expect(handleSetSpy).not.toHaveBeenCalled()
    })

    // ── Paste ───────────────────────────────────────────────────────────────

    it('handlePaste with clipboard files calls handleSetSelectedFiles and emits paste', async () => {
        // enablePaste defaults to false — must opt-in before init()
        store = new UpupStore()
        store.setConfig({ enablePaste: true } as unknown as UploaderProps)
        store.init()
        const fixture = await setup(store)
        const comp = fixture.componentInstance

        const handleSetSpy = vi
            .spyOn(store, 'handleSetSelectedFiles')
            .mockResolvedValue(undefined)
        const emitSpy = vi.spyOn(store.core, 'emit')

        const file = new File(['data'], 'clip.png', { type: 'image/png' })
        const item = {
            kind: 'file',
            getAsFile: () => file,
        } as unknown as DataTransferItem

        // jsdom doesn't expose ClipboardEvent constructor — use a plain stub
        const pasteEvent = {
            type: 'paste',
            preventDefault: vi.fn(),
            clipboardData: { items: [item] },
        } as unknown as ClipboardEvent

        comp.handlePaste(pasteEvent)

        expect(handleSetSpy).toHaveBeenCalled()
        expect(emitSpy).toHaveBeenCalledWith('paste', expect.any(Object))
    })

    it('handlePaste keeps a named file (report.pdf) UNRENAMED', async () => {
        store = new UpupStore()
        store.setConfig({ enablePaste: true } as unknown as UploaderProps)
        store.init()
        const fixture = await setup(store)
        const comp = fixture.componentInstance

        const handleSetSpy = vi
            .spyOn(store, 'handleSetSelectedFiles')
            .mockResolvedValue(undefined)
        const emitSpy = vi.spyOn(store.core, 'emit')

        const file = new File(['data'], 'report.pdf', {
            type: 'application/pdf',
        })
        const item = {
            kind: 'file',
            getAsFile: () => file,
        } as unknown as DataTransferItem
        const pasteEvent = {
            type: 'paste',
            preventDefault: vi.fn(),
            clipboardData: { items: [item] },
        } as unknown as ClipboardEvent

        comp.handlePaste(pasteEvent)

        expect(handleSetSpy).toHaveBeenCalled()
        const passed = handleSetSpy.mock.calls[0]![0] as File[]
        expect(passed[0]!.name).toBe('report.pdf')
        expect(emitSpy).toHaveBeenCalledWith('paste', expect.any(Object))
    })

    it('handlePaste renames an unnamed image.png to pasted-<digits>.png', async () => {
        store = new UpupStore()
        store.setConfig({ enablePaste: true } as unknown as UploaderProps)
        store.init()
        const fixture = await setup(store)
        const comp = fixture.componentInstance

        const handleSetSpy = vi
            .spyOn(store, 'handleSetSelectedFiles')
            .mockResolvedValue(undefined)

        const file = new File(['data'], 'image.png', { type: 'image/png' })
        const item = {
            kind: 'file',
            getAsFile: () => file,
        } as unknown as DataTransferItem
        const pasteEvent = {
            type: 'paste',
            preventDefault: vi.fn(),
            clipboardData: { items: [item] },
        } as unknown as ClipboardEvent

        comp.handlePaste(pasteEvent)

        expect(handleSetSpy).toHaveBeenCalled()
        const passed = handleSetSpy.mock.calls[0]![0] as File[]
        expect(passed[0]!.name).toMatch(/^pasted-\d+\.png$/)
    })
})
