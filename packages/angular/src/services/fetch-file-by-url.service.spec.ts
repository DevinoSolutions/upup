/**
 * fetch-file-by-url.service.spec.ts
 *
 * Tests FetchFileByUrlService using real behavior:
 *   - Stubs globalThis.fetch to return a synthetic Response/Blob
 *   - Asserts the service resolves a File with expected name + type
 *   - Covers the error path (non-ok response → onError called, returns undefined)
 *   - Tests loading signal transitions
 */
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest'
import { TestBed } from '@angular/core/testing'
import { UpupStore } from '../upup-store.service'
import { FetchFileByUrlService } from './fetch-file-by-url.service'

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeStore(): UpupStore {
    const store = new UpupStore()
    store.setConfig({})
    store.init()
    return store
}

function makeFakeBlob(content: string, type: string): Blob {
    return new Blob([content], { type })
}

/**
 * Build a minimal Response-like object that satisfies what fetch returns.
 * We use the real Response class if available, falling back to a plain object.
 */
function makeFakeResponse(blob: Blob, ok = true, status = 200): Response {
    return {
        ok,
        status,
        headers: new Headers({ 'content-type': blob.type }),
        blob: async () => blob,
    } as unknown as Response
}

// ── Suite ──────────────────────────────────────────────────────────────────────

describe('FetchFileByUrlService', () => {
    let store: UpupStore
    let svc: FetchFileByUrlService

    beforeEach(async () => {
        store = makeStore()
        await TestBed.configureTestingModule({
            providers: [
                { provide: UpupStore, useValue: store },
                FetchFileByUrlService,
            ],
        }).compileComponents()
        svc = TestBed.inject(FetchFileByUrlService)
    })

    afterEach(() => {
        store.destroy()
        vi.restoreAllMocks()
        TestBed.resetTestingModule()
    })

    // ── Happy path ─────────────────────────────────────────────────────────────

    it('resolves a File when fetch succeeds', async () => {
        const blob = makeFakeBlob('hello', 'image/png')
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(makeFakeResponse(blob))

        const file = await svc.fetchImage('https://example.com/photo.png')

        expect(file).toBeInstanceOf(File)
        expect(file!.type).toBe('image/png')
        // deriveFetchedFileName derives from URL — expects 'photo.png'
        expect(file!.name).toMatch(/photo\.png/i)
    })

    it('resolves a File from a data: URL (blob with no content-disposition)', async () => {
        const blob = makeFakeBlob('data', 'image/jpeg')
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(makeFakeResponse(blob))

        const file = await svc.fetchImage('data:image/jpeg;base64,/9j/abc')
        expect(file).toBeInstanceOf(File)
        expect(file!.type).toBe('image/jpeg')
    })

    it('emits url-fetch on the core when fetch succeeds', async () => {
        const blob = makeFakeBlob('x', 'text/plain')
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(makeFakeResponse(blob))

        const emitted: unknown[] = []
        store.core?.on('url-fetch', payload => emitted.push(payload))

        await svc.fetchImage('https://example.com/file.txt')
        expect(emitted.length).toBe(1)
    })

    // ── Loading signal ─────────────────────────────────────────────────────────

    it('sets loading to true during fetch and back to false after', async () => {
        const blob = makeFakeBlob('x', 'text/plain')
        let loadingDuringFetch = false

        vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
            loadingDuringFetch = svc.loading()
            return makeFakeResponse(blob)
        })

        expect(svc.loading()).toBe(false)
        await svc.fetchImage('https://example.com/x.txt')
        expect(loadingDuringFetch).toBe(true)
        expect(svc.loading()).toBe(false)
    })

    it('returns undefined and does not fetch when already loading', async () => {
        // Simulate loading=true
        svc.loading.set(true)
        const fetchSpy = vi.spyOn(globalThis, 'fetch')

        const result = await svc.fetchImage('https://example.com/x.txt')
        expect(result).toBeUndefined()
        expect(fetchSpy).not.toHaveBeenCalled()
        svc.loading.set(false) // cleanup
    })

    // ── Error path ─────────────────────────────────────────────────────────────

    it('calls onError and returns undefined on non-ok response', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            makeFakeResponse(makeFakeBlob('', 'text/plain'), false, 404),
        )

        const errors: string[] = []
        const originalOnError = store.uiProps.onError
        store.uiProps.onError = (msg: string) => errors.push(msg)

        const file = await svc.fetchImage('https://example.com/missing.png')
        expect(file).toBeUndefined()
        expect(errors.length).toBe(1)
        expect(errors[0]).toMatch(/404/)

        store.uiProps.onError = originalOnError
    })

    it('calls onError and returns undefined when fetch throws (network error)', async () => {
        vi.spyOn(globalThis, 'fetch').mockRejectedValue(
            new Error('Network failure'),
        )

        const errors: string[] = []
        const originalOnError = store.uiProps.onError
        store.uiProps.onError = (msg: string) => errors.push(msg)

        const file = await svc.fetchImage('https://example.com/x.png')
        expect(file).toBeUndefined()
        expect(errors).toEqual(['Network failure'])
        expect(svc.loading()).toBe(false)

        store.uiProps.onError = originalOnError
    })

    it('resets loading to false even on error', async () => {
        vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('fail'))
        store.uiProps.onError = () => {}

        await svc.fetchImage('https://example.com/x.png')
        expect(svc.loading()).toBe(false)
    })
})
