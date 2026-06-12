/**
 * main-box.spec.ts — TestBed tests for MainBoxComponent.
 *
 * Covers:
 *   - dropzone testid + slot render
 *   - FileList always present
 *   - AdapterSelector shown when no active adapter + no files / adding more
 *   - AdapterSelector hidden when adapter is active
 *   - AdapterView shown when adapter is active
 *   - Offline banner appears when isOnline=false
 *   - handleDrop with stubbed DataTransfer calls store.handleSetSelectedFiles + emits 'drop'
 *   - disableDragDrop suppresses drag handlers (handleSetSelectedFiles NOT called, isDragging stays false)
 *   - active adapter suppresses drag action
 *   - handlePaste with clipboard files calls handleSetSelectedFiles + emits 'paste'
 *   - onKeyDown Enter → openFilePicker called
 */
import { describe, it, expect, afterEach, vi } from 'vitest'
import { TestBed } from '@angular/core/testing'
import { signal } from '@angular/core'
import { UpupStore } from '../upup-store.service'
import { MainBoxComponent } from './main-box.component'

// ── Helpers ────────────────────────────────────────────────────────────────

/** Create + init a real UpupStore. */
function makeStore(): UpupStore {
    const store = new UpupStore()
    store.setConfig({} as any)
    store.init()
    return store
}

async function setup(store: UpupStore) {
    await TestBed.configureTestingModule({
        imports: [MainBoxComponent],
        providers: [{ provide: UpupStore, useValue: store }],
    }).compileComponents()

    const fixture = TestBed.createComponent(MainBoxComponent)
    fixture.detectChanges()
    return fixture
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('MainBoxComponent', () => {
    let store: UpupStore

    afterEach(() => {
        store?.dispose()
        TestBed.resetTestingModule()
    })

    // ── Structural ──────────────────────────────────────────────────────────

    it('renders the dropzone with correct testid and slot', async () => {
        store = makeStore()
        const fixture = await setup(store)
        const el: HTMLElement = fixture.nativeElement
        const dropzone = el.querySelector('[data-testid="upup-dropzone"]')
        expect(dropzone).not.toBeNull()
        expect(dropzone?.getAttribute('data-upup-slot')).toBe('main-box')
    })

    it('always renders upup-file-list', async () => {
        store = makeStore()
        const fixture = await setup(store)
        const el: HTMLElement = fixture.nativeElement
        expect(el.querySelector('upup-file-list')).not.toBeNull()
    })

    it('shows AdapterSelector when no active adapter and no files', async () => {
        store = makeStore()
        const fixture = await setup(store)
        const el: HTMLElement = fixture.nativeElement
        // No adapter, no files → selector visible
        expect(el.querySelector('upup-adapter-selector')).not.toBeNull()
    })

    it('hides AdapterSelector when an adapter is active', async () => {
        store = makeStore()
        const fixture = await setup(store)
        // Set active adapter
        store.setActiveAdapter('google-drive' as any)
        fixture.detectChanges()
        const el: HTMLElement = fixture.nativeElement
        expect(el.querySelector('upup-adapter-selector')).toBeNull()
    })

    it('shows AdapterView when an adapter is active', async () => {
        store = makeStore()
        const fixture = await setup(store)
        store.setActiveAdapter('google-drive' as any)
        fixture.detectChanges()
        const el: HTMLElement = fixture.nativeElement
        expect(el.querySelector('upup-adapter-view')).not.toBeNull()
    })

    it('hides AdapterView when no adapter is active', async () => {
        store = makeStore()
        const fixture = await setup(store)
        const el: HTMLElement = fixture.nativeElement
        expect(el.querySelector('upup-adapter-view')).toBeNull()
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

        const handleSetSpy = vi.spyOn(store, 'handleSetSelectedFiles').mockResolvedValue(undefined)
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
        store.setConfig({ disableDragDrop: true } as any)
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

        store.setActiveAdapter('google-drive' as any)
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
        store.setConfig({ enablePaste: true } as any)
        store.init()
        const fixture = await setup(store)
        const comp = fixture.componentInstance

        const handleSetSpy = vi.spyOn(store, 'handleSetSelectedFiles').mockResolvedValue(undefined)
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
        store.setConfig({ enablePaste: true } as any)
        store.init()
        const fixture = await setup(store)
        const comp = fixture.componentInstance

        const handleSetSpy = vi.spyOn(store, 'handleSetSelectedFiles').mockResolvedValue(undefined)
        const emitSpy = vi.spyOn(store.core, 'emit')

        const file = new File(['data'], 'report.pdf', { type: 'application/pdf' })
        const item = { kind: 'file', getAsFile: () => file } as unknown as DataTransferItem
        const pasteEvent = {
            type: 'paste',
            preventDefault: vi.fn(),
            clipboardData: { items: [item] },
        } as unknown as ClipboardEvent

        comp.handlePaste(pasteEvent)

        expect(handleSetSpy).toHaveBeenCalled()
        const passed = handleSetSpy.mock.calls[0][0] as File[]
        expect(passed[0].name).toBe('report.pdf')
        expect(emitSpy).toHaveBeenCalledWith('paste', expect.any(Object))
    })

    it('handlePaste renames an unnamed image.png to pasted-<digits>.png', async () => {
        store = new UpupStore()
        store.setConfig({ enablePaste: true } as any)
        store.init()
        const fixture = await setup(store)
        const comp = fixture.componentInstance

        const handleSetSpy = vi.spyOn(store, 'handleSetSelectedFiles').mockResolvedValue(undefined)

        const file = new File(['data'], 'image.png', { type: 'image/png' })
        const item = { kind: 'file', getAsFile: () => file } as unknown as DataTransferItem
        const pasteEvent = {
            type: 'paste',
            preventDefault: vi.fn(),
            clipboardData: { items: [item] },
        } as unknown as ClipboardEvent

        comp.handlePaste(pasteEvent)

        expect(handleSetSpy).toHaveBeenCalled()
        const passed = handleSetSpy.mock.calls[0][0] as File[]
        expect(passed[0].name).toMatch(/^pasted-\d+\.png$/)
    })

    // ── Keyboard ────────────────────────────────────────────────────────────

    it('onKeyDown Enter calls openFilePicker', async () => {
        store = makeStore()
        const fixture = await setup(store)
        const comp = fixture.componentInstance

        const openSpy = vi.spyOn(store, 'openFilePicker')
        const keyEvent = new KeyboardEvent('keydown', { key: 'Enter' })
        // Spy on preventDefault
        const preventSpy = vi.spyOn(keyEvent, 'preventDefault')

        comp.onKeyDown(keyEvent)

        expect(preventSpy).toHaveBeenCalled()
        expect(openSpy).toHaveBeenCalled()
    })

    it('onKeyDown Space calls openFilePicker', async () => {
        store = makeStore()
        const fixture = await setup(store)
        const comp = fixture.componentInstance

        const openSpy = vi.spyOn(store, 'openFilePicker')
        const keyEvent = new KeyboardEvent('keydown', { key: ' ' })

        comp.onKeyDown(keyEvent)

        expect(openSpy).toHaveBeenCalled()
    })
})
