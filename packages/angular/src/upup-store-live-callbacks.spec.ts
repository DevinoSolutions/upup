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
import { UpupStore } from './upup-store.service'
import { UpupUploaderComponent } from './upup-uploader.component'
import type { UploaderProps } from './shared/types'

afterEach(() => {
    TestBed.resetTestingModule()
})

const zipFile = () => new File(['x'], 'bundle.zip', { type: 'application/zip' })
const pngFile = () => new File(['x'], 'photo.png', { type: 'image/png' })

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
