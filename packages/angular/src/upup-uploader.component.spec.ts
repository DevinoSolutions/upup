import { describe, it, expect, afterEach, vi } from 'vitest'
import { PLATFORM_ID } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { UpupUploaderComponent } from './upup-uploader.component'

afterEach(() => {
    TestBed.resetTestingModule()
})

describe('UpupUploaderComponent', () => {
    it('mounts and renders the uploader root', () => {
        const f = TestBed.createComponent(UpupUploaderComponent)
        f.componentInstance.config = {} as any
        f.detectChanges() // triggers ngOnInit → store.init()
        expect(
            (f.nativeElement as HTMLElement).querySelector('[data-testid="upup-root"]'),
        ).toBeTruthy()
    })

    it('re-initializes the store when config changes after init', () => {
        const f = TestBed.createComponent(UpupUploaderComponent)
        f.componentInstance.config = {} as any
        f.detectChanges()
        const core1 = f.componentInstance.store.core
        f.componentInstance.config = { showBranding: false } as any // setter runs, started=true → dispose+init
        const core2 = f.componentInstance.store.core
        expect(core1).not.toBe(core2)
    })

    it('forwards the 5 core events to the matching outputs', () => {
        const f = TestBed.createComponent(UpupUploaderComponent)
        f.componentInstance.config = {} as any
        f.detectChanges()
        const seen: Record<string, unknown> = {}
        f.componentInstance.filesAdded.subscribe(v => (seen['filesAdded'] = v))
        f.componentInstance.fileRemoved.subscribe(v => (seen['fileRemoved'] = v))
        f.componentInstance.uploadProgress.subscribe(v => (seen['uploadProgress'] = v))
        f.componentInstance.uploadAllComplete.subscribe(v => (seen['uploadAllComplete'] = v))
        f.componentInstance.error.subscribe(v => (seen['error'] = v))
        const core = f.componentInstance.store.core
        const file = { id: 'a', name: 'a.txt' } as any
        core.emit('files-added', [file])
        core.emit('file-removed', file)
        core.emit('upload-progress', { fileId: 'a', loaded: 1, total: 2 })
        core.emit('upload-all-complete', [file])
        core.emit('error', { error: new Error('boom') })
        expect(seen['filesAdded']).toEqual([file])
        expect(seen['fileRemoved']).toEqual(file)
        expect(seen['uploadProgress']).toEqual({ fileId: 'a', loaded: 1, total: 2 })
        expect(seen['uploadAllComplete']).toEqual([file])
        expect((seen['error'] as { error: Error }).error.message).toBe('boom')
    })

    it('skips store init on the server (SSR-safe)', () => {
        TestBed.overrideProvider(PLATFORM_ID, { useValue: 'server' })
        const f = TestBed.createComponent(UpupUploaderComponent)
        f.componentInstance.config = {} as any
        f.detectChanges()
        expect(f.componentInstance['started']).toBe(false) // ngOnInit guard returned early
    })

    it('disposes the store on destroy', () => {
        const f = TestBed.createComponent(UpupUploaderComponent)
        f.componentInstance.config = {} as any
        f.detectChanges()
        const disposeSpy = vi.spyOn(f.componentInstance.store, 'dispose')
        f.destroy()
        expect(disposeSpy).toHaveBeenCalled()
    })

    // ── Root-shell / branding / container / file-input ──────────────────────

    it('renders upup-container section', () => {
        const f = TestBed.createComponent(UpupUploaderComponent)
        f.componentInstance.config = {} as any
        f.detectChanges()
        expect(
            (f.nativeElement as HTMLElement).querySelector('[data-testid="upup-container"]'),
        ).toBeTruthy()
    })

    it('renders upup-branding when not mini and showBranding is not false', () => {
        const f = TestBed.createComponent(UpupUploaderComponent)
        f.componentInstance.config = { showBranding: true } as any
        f.detectChanges()
        expect(
            (f.nativeElement as HTMLElement).querySelector('[data-testid="upup-branding"]'),
        ).toBeTruthy()
    })

    it('hides upup-branding when mini=true', () => {
        const f = TestBed.createComponent(UpupUploaderComponent)
        f.componentInstance.config = { mini: true } as any
        f.detectChanges()
        expect(
            (f.nativeElement as HTMLElement).querySelector('[data-testid="upup-branding"]'),
        ).toBeFalsy()
    })

    it('hides upup-branding when showBranding=false', () => {
        const f = TestBed.createComponent(UpupUploaderComponent)
        f.componentInstance.config = { showBranding: false } as any
        f.detectChanges()
        expect(
            (f.nativeElement as HTMLElement).querySelector('[data-testid="upup-branding"]'),
        ).toBeFalsy()
    })

    it('renders hidden upup-file-input', () => {
        const f = TestBed.createComponent(UpupUploaderComponent)
        f.componentInstance.config = {} as any
        f.detectChanges()
        const input = (f.nativeElement as HTMLElement).querySelector('[data-testid="upup-file-input"]') as HTMLInputElement | null
        expect(input).toBeTruthy()
        expect(input?.type).toBe('file')
        expect(input?.style.display).toBe('none')
    })

    it('onInputChange with files calls store.handleSetSelectedFiles', () => {
        const f = TestBed.createComponent(UpupUploaderComponent)
        f.componentInstance.config = {} as any
        f.detectChanges()

        const handleSetSpy = vi.spyOn(f.componentInstance.store, 'handleSetSelectedFiles').mockResolvedValue(undefined)

        const file = new File(['x'], 'x.txt')
        const input = document.createElement('input')
        Object.defineProperty(input, 'files', {
            value: { length: 1, 0: file, [Symbol.iterator]: function* () { yield file } },
        })
        const event = { target: input } as unknown as Event
        f.componentInstance.onInputChange(event)

        expect(handleSetSpy).toHaveBeenCalled()
    })

    it('does not render upup-image-editor-stub when imageEditor.enabled is false', () => {
        const f = TestBed.createComponent(UpupUploaderComponent)
        f.componentInstance.config = { imageEditor: { enabled: false } } as any
        f.detectChanges()
        expect(
            (f.nativeElement as HTMLElement).querySelector('upup-image-editor-stub'),
        ).toBeFalsy()
    })
})
