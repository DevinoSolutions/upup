import { describe, it, expect, afterEach } from 'vitest'
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
})
