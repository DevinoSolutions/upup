/**
 * Host callbacks stay live after init(): a handler set or swapped on the store
 * (or on the component's `config` input) after the uploader is up is the one
 * that hears refusals, and a whole-run failure reaches onError exactly once
 * (T-15382). Plain-class store tests need no TestBed; the component-level
 * test does, so it pays the cold JIT compile in a beforeAll like the other
 * component specs.
 */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest'
import { PLATFORM_ID } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { FileSource, UploadStatus, type UploadFile } from '@useupup/core'
import { UpupStore } from './upup-store.service'
import { UpupUploaderComponent } from './upup-uploader.component'
import type { UploaderProps } from './shared/types'

afterEach(() => {
    TestBed.resetTestingModule()
})

const zipFile = () => new File(['x'], 'bundle.zip', { type: 'application/zip' })
const pngFile = () => new File(['x'], 'photo.png', { type: 'image/png' })

// Minimal EventSource stand-in: lets a test open and answer the server-processing
// stream without a network.
class FakeEventSource {
    static instances: FakeEventSource[] = []
    onmessage: ((event: MessageEvent) => void) | null = null
    onerror: (() => void) | null = null
    constructor(readonly url: string) {
        FakeEventSource.instances.push(this)
    }
    close() {}
    emit(data: string) {
        this.onmessage?.({ data } as MessageEvent)
    }
}

const uploadedFile = (key: string) =>
    ({
        id: key,
        name: 'photo.png',
        key,
        url: 'blob:x',
        source: FileSource.LOCAL,
        status: UploadStatus.SUCCESSFUL,
        metadata: {},
    }) as unknown as UploadFile

describe('UpupStore callbacks after init()', () => {
    it('reaches the handlers swapped in by setConfig and never the old ones', async () => {
        const first = {
            onError: vi.fn(),
            onRestrictionFailed: vi.fn(),
            onFileTypeMismatch: vi.fn(),
        }
        const s = new UpupStore()
        s.setConfig({ allowedFileTypes: 'image/*', ...first })
        s.init()
        const next = {
            onError: vi.fn(),
            onRestrictionFailed: vi.fn(),
            onFileTypeMismatch: vi.fn(),
        }
        s.setConfig({ allowedFileTypes: 'image/*', ...next })
        const zip = zipFile()

        await s.handleSetSelectedFiles([zip])

        expect(next.onError).toHaveBeenCalledTimes(1)
        expect(next.onRestrictionFailed).toHaveBeenCalledTimes(1)
        expect(next.onRestrictionFailed).toHaveBeenCalledWith(
            zip,
            'TYPE_MISMATCH',
        )
        expect(next.onFileTypeMismatch).toHaveBeenCalledTimes(1)
        expect(first.onError).not.toHaveBeenCalled()
        expect(first.onRestrictionFailed).not.toHaveBeenCalled()
        expect(first.onFileTypeMismatch).not.toHaveBeenCalled()
        s.destroy()
    })

    it('fires handlers that were absent at init and added later, once', async () => {
        const s = new UpupStore()
        s.setConfig({ allowedFileTypes: 'image/*' })
        s.init()
        const onError = vi.fn()
        const onRestrictionFailed = vi.fn()
        s.setConfig({
            allowedFileTypes: 'image/*',
            onError,
            onRestrictionFailed,
        })
        const zip = zipFile()

        await s.handleSetSelectedFiles([zip])

        expect(onError).toHaveBeenCalledTimes(1)
        expect(onRestrictionFailed).toHaveBeenCalledTimes(1)
        expect(onRestrictionFailed).toHaveBeenCalledWith(zip, 'TYPE_MISMATCH')
        s.destroy()
    })

    it('reports a whole-run failure with no upload target to onError exactly once', async () => {
        const onError = vi.fn()
        const s = new UpupStore()
        s.setConfig({ onError })
        s.init()
        await s.handleSetSelectedFiles([pngFile()])

        await s.startUpload().catch(() => undefined)

        expect(onError).toHaveBeenCalledTimes(1)
        expect(onError.mock.calls[0]![0]).toMatch(/No upload target/)
        s.destroy()
    })
})

describe('a non-refusal callback swapped by setConfig after init()', () => {
    it('reaches the new onFilesSelected and never the old one', async () => {
        const first = vi.fn()
        const s = new UpupStore()
        s.setConfig({ allowedFileTypes: 'image/*', onFilesSelected: first })
        s.init()
        const next = vi.fn()
        s.setConfig({ allowedFileTypes: 'image/*', onFilesSelected: next })

        await s.handleSetSelectedFiles([pngFile()])

        expect(next).toHaveBeenCalledTimes(1)
        expect(first).not.toHaveBeenCalled()
        s.destroy()
    })
})

describe('onBeforeFileAdded swapped by setConfig after init()', () => {
    it('asks the new handler and never the old one', async () => {
        const first = vi.fn(() => undefined)
        const s = new UpupStore()
        s.setConfig({ allowedFileTypes: 'image/*', onBeforeFileAdded: first })
        s.init()
        const next = vi.fn(() => undefined)
        s.setConfig({ allowedFileTypes: 'image/*', onBeforeFileAdded: next })
        const png = pngFile()

        await s.handleSetSelectedFiles([png])

        expect(next).toHaveBeenCalledTimes(1)
        expect(next).toHaveBeenCalledWith(png)
        expect(first).not.toHaveBeenCalled()
        s.destroy()
    })

    it('drops a file the new handler vetoes, sync or async', async () => {
        const onFilesSelected = vi.fn()
        const s = new UpupStore()
        s.setConfig({
            allowedFileTypes: 'image/*',
            onFilesSelected,
            onBeforeFileAdded: () => undefined,
        })
        s.init()
        s.setConfig({
            allowedFileTypes: 'image/*',
            onFilesSelected,
            onBeforeFileAdded: () => false,
        })
        await s.handleSetSelectedFiles([pngFile()])
        s.setConfig({
            allowedFileTypes: 'image/*',
            onFilesSelected,
            onBeforeFileAdded: () => Promise.resolve(false),
        })
        await s.handleSetSelectedFiles([pngFile()])

        expect(onFilesSelected).not.toHaveBeenCalled()
        s.destroy()
    })

    it('admits the file the new handler substitutes', async () => {
        const onFilesSelected = vi.fn()
        const s = new UpupStore()
        s.setConfig({
            allowedFileTypes: 'image/*',
            onFilesSelected,
            onBeforeFileAdded: () => undefined,
        })
        s.init()
        s.setConfig({
            allowedFileTypes: 'image/*',
            onFilesSelected,
            onBeforeFileAdded: () =>
                new File(['x'], 'renamed.png', { type: 'image/png' }),
        })

        await s.handleSetSelectedFiles([pngFile()])

        expect(onFilesSelected).toHaveBeenCalledTimes(1)
        expect(onFilesSelected.mock.calls[0]![0][0].name).toBe('renamed.png')
        s.destroy()
    })

    it('applies a handler that was absent at init and added later', async () => {
        const onFilesSelected = vi.fn()
        const s = new UpupStore()
        s.setConfig({ allowedFileTypes: 'image/*', onFilesSelected })
        s.init()
        const late = vi.fn(() => false as const)
        s.setConfig({
            allowedFileTypes: 'image/*',
            onFilesSelected,
            onBeforeFileAdded: late,
        })

        await s.handleSetSelectedFiles([pngFile()])

        expect(late).toHaveBeenCalledTimes(1)
        expect(onFilesSelected).not.toHaveBeenCalled()
        s.destroy()
    })

    it('admits files as before when no handler was ever set', async () => {
        const onFilesSelected = vi.fn()
        const s = new UpupStore()
        s.setConfig({ allowedFileTypes: 'image/*', onFilesSelected })
        s.init()

        await s.handleSetSelectedFiles([pngFile()])

        expect(onFilesSelected).toHaveBeenCalledTimes(1)
        s.destroy()
    })
})

describe('onFileProcessed swapped by setConfig after init()', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
    })

    // Finishing a file is what opens its processing stream; drive that through
    // core's own event, with EventSource faked.
    function initStore(config: UploaderProps) {
        FakeEventSource.instances = []
        vi.stubGlobal('EventSource', FakeEventSource)
        const s = new UpupStore()
        s.setConfig({ processingEndpoint: '/api/processing', ...config })
        s.init()
        const finish = (key: string) =>
            s.core.emit('upload-all-complete', [uploadedFile(key)])
        return { s, finish }
    }

    it('reaches the new handler and never the old one', () => {
        const first = vi.fn()
        const { s, finish } = initStore({ onFileProcessed: first })
        const next = vi.fn()
        s.setConfig({
            processingEndpoint: '/api/processing',
            onFileProcessed: next,
        })

        finish('k1')
        FakeEventSource.instances[0]!.emit('{"status":"done"}')

        expect(next).toHaveBeenCalledTimes(1)
        expect(next.mock.calls[0]![1]).toEqual({ status: 'done' })
        expect(first).not.toHaveBeenCalled()
        s.destroy()
    })

    it('hands a stream already open to the handler in place when the message lands', () => {
        const first = vi.fn()
        const { s, finish } = initStore({ onFileProcessed: first })
        finish('k1')
        const next = vi.fn()
        s.setConfig({
            processingEndpoint: '/api/processing',
            onFileProcessed: next,
        })

        FakeEventSource.instances[0]!.emit('{"status":"done"}')

        expect(next).toHaveBeenCalledTimes(1)
        expect(first).not.toHaveBeenCalled()
        s.destroy()
    })

    it('listens for a handler that was absent at init and added later', () => {
        const { s, finish } = initStore({})
        const late = vi.fn()
        s.setConfig({
            processingEndpoint: '/api/processing',
            onFileProcessed: late,
        })

        finish('k1')
        FakeEventSource.instances[0]!.emit('{"status":"done"}')

        expect(late).toHaveBeenCalledTimes(1)
        s.destroy()
    })

    it('opens no stream while there is no handler', () => {
        const { s, finish } = initStore({})

        finish('k1')

        expect(FakeEventSource.instances).toHaveLength(0)
        s.destroy()
    })
})

describe('UpupUploaderComponent config input after init', () => {
    beforeAll(() => {
        const f = TestBed.createComponent(UpupUploaderComponent)
        try {
            f.componentInstance.config = {} as unknown as UploaderProps
            f.detectChanges()
        } finally {
            f.destroy()
            TestBed.resetTestingModule()
        }
    }, 30_000)

    it('sends a refusal to the callbacks of the config swapped in, not the old one', async () => {
        TestBed.configureTestingModule({
            providers: [{ provide: PLATFORM_ID, useValue: 'browser' }],
        })
        const f = TestBed.createComponent(UpupUploaderComponent)
        const firstOnRestrictionFailed = vi.fn()
        f.componentInstance.config = {
            allowedFileTypes: 'image/*',
            onRestrictionFailed: firstOnRestrictionFailed,
        } as UploaderProps
        f.detectChanges()
        const nextOnRestrictionFailed = vi.fn()
        f.componentInstance.config = {
            allowedFileTypes: 'image/*',
            onRestrictionFailed: nextOnRestrictionFailed,
        } as UploaderProps
        f.detectChanges()
        const zip = zipFile()

        await f.componentInstance.store.handleSetSelectedFiles([zip])

        expect(nextOnRestrictionFailed).toHaveBeenCalledTimes(1)
        expect(nextOnRestrictionFailed).toHaveBeenCalledWith(
            zip,
            'TYPE_MISMATCH',
        )
        expect(firstOnRestrictionFailed).not.toHaveBeenCalled()
    })
})
