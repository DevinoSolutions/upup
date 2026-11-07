import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte'
import { FileSource, UploadStatus, type UploadFile } from '@useupup/core'
import UpupUploader from '../src/UpupUploader.svelte'
import type { UploaderContextHandle } from '../src/context/create-uploader-context'
import ContextHarness from './fixtures/UploaderContextHarness.svelte'

beforeAll(() => {
    vi.stubGlobal('matchMedia', (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
    }))
    vi.stubGlobal(
        'ResizeObserver',
        class {
            observe() {}
            unobserve() {}
            disconnect() {}
        },
    )
})

afterEach(() => cleanup())

const makeFile = (name: string, type: string) => new File(['x'], name, { type })

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

async function pick(container: HTMLElement, files: File[]) {
    const input = container.querySelector(
        '[data-testid="upup-file-input"]',
    ) as HTMLInputElement
    await fireEvent.change(input, { target: { files } })
}

describe('a callback swapped after the Svelte uploader mounted', () => {
    it('reaches the new handler and never the old one for a refused file', async () => {
        const firstOnError = vi.fn()
        const firstOnRestrictionFailed = vi.fn()
        const firstOnFileTypeMismatch = vi.fn()
        const { container, rerender } = render(UpupUploader, {
            props: {
                allowedFileTypes: 'image/*',
                onError: firstOnError,
                onRestrictionFailed: firstOnRestrictionFailed,
                onFileTypeMismatch: firstOnFileTypeMismatch,
            },
        })
        const nextOnError = vi.fn()
        const nextOnRestrictionFailed = vi.fn()
        const nextOnFileTypeMismatch = vi.fn()
        await rerender({
            onError: nextOnError,
            onRestrictionFailed: nextOnRestrictionFailed,
            onFileTypeMismatch: nextOnFileTypeMismatch,
        })
        const zip = makeFile('bundle.zip', 'application/zip')

        await pick(container, [zip])

        await waitFor(() => {
            expect(nextOnRestrictionFailed).toHaveBeenCalledTimes(1)
        })
        expect(nextOnRestrictionFailed).toHaveBeenCalledWith(
            zip,
            'TYPE_MISMATCH',
        )
        expect(nextOnError).toHaveBeenCalledTimes(1)
        expect(nextOnFileTypeMismatch).toHaveBeenCalledTimes(1)
        expect(firstOnError).not.toHaveBeenCalled()
        expect(firstOnRestrictionFailed).not.toHaveBeenCalled()
        expect(firstOnFileTypeMismatch).not.toHaveBeenCalled()
    })

    it('fires a handler that was absent at mount and added later, once', async () => {
        const { container, rerender } = render(UpupUploader, {
            props: { allowedFileTypes: 'image/*' },
        })
        const lateOnError = vi.fn()
        const lateOnRestrictionFailed = vi.fn()
        await rerender({
            onError: lateOnError,
            onRestrictionFailed: lateOnRestrictionFailed,
        })
        const zip = makeFile('bundle.zip', 'application/zip')

        await pick(container, [zip])

        await waitFor(() => {
            expect(lateOnRestrictionFailed).toHaveBeenCalledTimes(1)
        })
        expect(lateOnRestrictionFailed).toHaveBeenCalledWith(
            zip,
            'TYPE_MISMATCH',
        )
        expect(lateOnError).toHaveBeenCalledTimes(1)
    })
})

describe('a non-refusal callback swapped after the Svelte uploader mounted', () => {
    it('reaches the new onFilesSelected and never the old one', async () => {
        const first = vi.fn()
        const { container, rerender } = render(UpupUploader, {
            props: { allowedFileTypes: 'image/*', onFilesSelected: first },
        })
        const next = vi.fn()
        await rerender({ onFilesSelected: next })

        await pick(container, [makeFile('photo.png', 'image/png')])

        await waitFor(() => {
            expect(next).toHaveBeenCalledTimes(1)
        })
        expect(first).not.toHaveBeenCalled()
    })
})

describe('onBeforeFileAdded swapped after the Svelte uploader mounted', () => {
    it('asks the new handler and never the old one', async () => {
        const first = vi.fn(() => undefined)
        const { container, rerender } = render(UpupUploader, {
            props: { allowedFileTypes: 'image/*', onBeforeFileAdded: first },
        })
        const next = vi.fn(() => undefined)
        await rerender({ onBeforeFileAdded: next })
        const png = makeFile('photo.png', 'image/png')

        await pick(container, [png])

        await waitFor(() => {
            expect(next).toHaveBeenCalledTimes(1)
        })
        expect(next).toHaveBeenCalledWith(png)
        expect(first).not.toHaveBeenCalled()
    })

    it('drops a file the new handler vetoes, sync or async', async () => {
        const onFilesSelected = vi.fn()
        const veto = vi.fn(() => false as const)
        const vetoLater = vi.fn(() => Promise.resolve(false as const))
        const { container, rerender } = render(UpupUploader, {
            props: {
                allowedFileTypes: 'image/*',
                onFilesSelected,
                onBeforeFileAdded: () => undefined,
            },
        })
        await rerender({ onBeforeFileAdded: veto })
        await pick(container, [makeFile('a.png', 'image/png')])
        await waitFor(() => {
            expect(veto).toHaveBeenCalledTimes(1)
        })
        await rerender({ onBeforeFileAdded: vetoLater })
        await pick(container, [makeFile('b.png', 'image/png')])
        await waitFor(() => {
            expect(vetoLater).toHaveBeenCalledTimes(1)
        })

        expect(onFilesSelected).not.toHaveBeenCalled()
    })

    it('admits the file the new handler substitutes', async () => {
        const onFilesSelected = vi.fn()
        const { container, rerender } = render(UpupUploader, {
            props: {
                allowedFileTypes: 'image/*',
                onFilesSelected,
                onBeforeFileAdded: () => undefined,
            },
        })
        await rerender({
            onBeforeFileAdded: () => makeFile('renamed.png', 'image/png'),
        })

        await pick(container, [makeFile('photo.png', 'image/png')])

        await waitFor(() => {
            expect(onFilesSelected).toHaveBeenCalledTimes(1)
        })
        expect(onFilesSelected.mock.calls[0]![0][0].name).toBe('renamed.png')
    })

    it('applies a handler that was absent at mount and added later', async () => {
        const onFilesSelected = vi.fn()
        const { container, rerender } = render(UpupUploader, {
            props: { allowedFileTypes: 'image/*', onFilesSelected },
        })
        const late = vi.fn(() => false as const)
        await rerender({ onBeforeFileAdded: late })

        await pick(container, [makeFile('photo.png', 'image/png')])

        await waitFor(() => {
            expect(late).toHaveBeenCalledTimes(1)
        })
        expect(onFilesSelected).not.toHaveBeenCalled()
    })

    it('admits files as before when no handler was ever set', async () => {
        const onFilesSelected = vi.fn()
        const { container } = render(UpupUploader, {
            props: { allowedFileTypes: 'image/*', onFilesSelected },
        })

        await pick(container, [makeFile('photo.png', 'image/png')])

        await waitFor(() => {
            expect(onFilesSelected).toHaveBeenCalledTimes(1)
        })
    })
})

describe('onFileProcessed swapped after the Svelte uploader mounted', () => {
    // Finishing a file is what opens its processing stream; drive that through
    // core's own event, with EventSource faked.
    function mountContext(initial: Record<string, unknown>) {
        FakeEventSource.instances = []
        vi.stubGlobal('EventSource', FakeEventSource)
        const sink: { ctx?: UploaderContextHandle } = {}
        const { rerender } = render(ContextHarness, {
            props: { sink, processingEndpoint: '/api/processing', ...initial },
        })
        const finish = (key: string) =>
            sink.ctx!.core!.emit('upload-all-complete', [uploadedFile(key)])
        return { rerender, finish }
    }

    it('reaches the new handler and never the old one', async () => {
        const first = vi.fn()
        const { rerender, finish } = mountContext({ onFileProcessed: first })
        const next = vi.fn()
        await rerender({ onFileProcessed: next })

        finish('k1')
        FakeEventSource.instances[0]!.emit('{"status":"done"}')

        expect(next).toHaveBeenCalledTimes(1)
        expect(next.mock.calls[0]![1]).toEqual({ status: 'done' })
        expect(first).not.toHaveBeenCalled()
    })

    it('hands a stream already open to the handler in place when the message lands', async () => {
        const first = vi.fn()
        const { rerender, finish } = mountContext({ onFileProcessed: first })
        finish('k1')
        const next = vi.fn()
        await rerender({ onFileProcessed: next })

        FakeEventSource.instances[0]!.emit('{"status":"done"}')

        expect(next).toHaveBeenCalledTimes(1)
        expect(first).not.toHaveBeenCalled()
    })

    it('listens for a handler that was absent at mount and added later', async () => {
        const { rerender, finish } = mountContext({})
        const late = vi.fn()
        await rerender({ onFileProcessed: late })

        finish('k1')
        FakeEventSource.instances[0]!.emit('{"status":"done"}')

        expect(late).toHaveBeenCalledTimes(1)
    })

    it('opens no stream while there is no handler', () => {
        const { finish } = mountContext({})

        finish('k1')

        expect(FakeEventSource.instances).toHaveLength(0)
    })
})
