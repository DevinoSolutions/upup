import { afterEach, describe, expect, it, vi } from 'vitest'
import {
    act,
    cleanup,
    fireEvent,
    render,
    renderHook,
    waitFor,
} from '@testing-library/react'
import React from 'react'
import { FileSource, UploadStatus, type UploadFile } from '@useupup/core'
import { UpupUploader } from '../src'
import useUploaderController from '../src/hooks/useUploaderController'
import type { UploaderProps } from '../src/shared/types'

/**
 * T-15492 — the canon the Vue, Svelte and Angular ports are held to. A host
 * that swaps `onBeforeFileAdded` / `onFileProcessed` (or any controller
 * callback) on a re-render must see the new handler heard and the old one
 * silent. React reads them through `updateOptions()` / a per-render
 * `connectSSE`, so most of this already holds; the stream test pins the one
 * place it did not: a stream opened before the swap.
 */

const makeFile = (name: string, type: string) => new File(['x'], name, { type })

function pick(container: HTMLElement, files: File[]) {
    const input = container.querySelector(
        '[data-testid="upup-file-input"]',
    ) as HTMLInputElement
    fireEvent.change(input, { target: { files } })
}

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

afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
})

describe('a callback swapped on a React re-render', () => {
    it('reaches the new onFilesSelected and never the old one', async () => {
        const first = vi.fn()
        const { container, rerender } = render(
            <UpupUploader allowedFileTypes="image/*" onFilesSelected={first} />,
        )
        const next = vi.fn()
        rerender(
            <UpupUploader allowedFileTypes="image/*" onFilesSelected={next} />,
        )

        pick(container, [makeFile('photo.png', 'image/png')])

        await waitFor(() => {
            expect(next).toHaveBeenCalledTimes(1)
        })
        expect(first).not.toHaveBeenCalled()
    })
})

describe('onBeforeFileAdded swapped on a React re-render', () => {
    it('asks the new handler and never the old one', async () => {
        const first = vi.fn(() => undefined)
        const { container, rerender } = render(
            <UpupUploader
                allowedFileTypes="image/*"
                onBeforeFileAdded={first}
            />,
        )
        const next = vi.fn(() => undefined)
        rerender(
            <UpupUploader
                allowedFileTypes="image/*"
                onBeforeFileAdded={next}
            />,
        )
        const png = makeFile('photo.png', 'image/png')

        pick(container, [png])

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
        const { container, rerender } = render(
            <UpupUploader
                allowedFileTypes="image/*"
                onFilesSelected={onFilesSelected}
                onBeforeFileAdded={() => undefined}
            />,
        )
        rerender(
            <UpupUploader
                allowedFileTypes="image/*"
                onFilesSelected={onFilesSelected}
                onBeforeFileAdded={veto}
            />,
        )
        pick(container, [makeFile('a.png', 'image/png')])
        await waitFor(() => {
            expect(veto).toHaveBeenCalledTimes(1)
        })
        rerender(
            <UpupUploader
                allowedFileTypes="image/*"
                onFilesSelected={onFilesSelected}
                onBeforeFileAdded={vetoLater}
            />,
        )
        pick(container, [makeFile('b.png', 'image/png')])
        await waitFor(() => {
            expect(vetoLater).toHaveBeenCalledTimes(1)
        })

        expect(onFilesSelected).not.toHaveBeenCalled()
    })

    it('admits the file the new handler substitutes', async () => {
        const onFilesSelected = vi.fn()
        const { container, rerender } = render(
            <UpupUploader
                allowedFileTypes="image/*"
                onFilesSelected={onFilesSelected}
                onBeforeFileAdded={() => undefined}
            />,
        )
        rerender(
            <UpupUploader
                allowedFileTypes="image/*"
                onFilesSelected={onFilesSelected}
                onBeforeFileAdded={() => makeFile('renamed.png', 'image/png')}
            />,
        )

        pick(container, [makeFile('photo.png', 'image/png')])

        await waitFor(() => {
            expect(onFilesSelected).toHaveBeenCalledTimes(1)
        })
        expect(onFilesSelected.mock.calls[0]![0][0].name).toBe('renamed.png')
    })

    it('applies a handler that was absent at mount and added later', async () => {
        const onFilesSelected = vi.fn()
        const { container, rerender } = render(
            <UpupUploader
                allowedFileTypes="image/*"
                onFilesSelected={onFilesSelected}
            />,
        )
        const late = vi.fn(() => false as const)
        rerender(
            <UpupUploader
                allowedFileTypes="image/*"
                onFilesSelected={onFilesSelected}
                onBeforeFileAdded={late}
            />,
        )

        pick(container, [makeFile('photo.png', 'image/png')])

        await waitFor(() => {
            expect(late).toHaveBeenCalledTimes(1)
        })
        expect(onFilesSelected).not.toHaveBeenCalled()
    })

    it('admits files as before when no handler was ever set', async () => {
        const onFilesSelected = vi.fn()
        const { container } = render(
            <UpupUploader
                allowedFileTypes="image/*"
                onFilesSelected={onFilesSelected}
            />,
        )

        pick(container, [makeFile('photo.png', 'image/png')])

        await waitFor(() => {
            expect(onFilesSelected).toHaveBeenCalledTimes(1)
        })
    })
})

describe('onFileProcessed swapped on a React re-render', () => {
    // Finishing a file is what opens its processing stream; drive that through
    // core's own event, with EventSource faked.
    function mountController(initial: UploaderProps) {
        FakeEventSource.instances = []
        vi.stubGlobal('EventSource', FakeEventSource)
        const hook = renderHook(
            (props: UploaderProps) => useUploaderController(props),
            {
                initialProps: {
                    processingEndpoint: '/api/processing',
                    ...initial,
                },
            },
        )
        const finish = (key: string) => {
            act(() => {
                hook.result.current.core!.emit('upload-all-complete', [
                    uploadedFile(key),
                ])
            })
        }
        const swap = (next: UploaderProps) => {
            hook.rerender({ processingEndpoint: '/api/processing', ...next })
        }
        return { finish, swap }
    }

    it('reaches the new handler and never the old one', () => {
        const first = vi.fn()
        const { finish, swap } = mountController({ onFileProcessed: first })
        const next = vi.fn()
        swap({ onFileProcessed: next })

        finish('k1')
        act(() => {
            FakeEventSource.instances[0]!.emit('{"status":"done"}')
        })

        expect(next).toHaveBeenCalledTimes(1)
        expect(next.mock.calls[0]![1]).toEqual({ status: 'done' })
        expect(first).not.toHaveBeenCalled()
    })

    it('hands a stream already open to the handler in place when the message lands', () => {
        const first = vi.fn()
        const { finish, swap } = mountController({ onFileProcessed: first })
        finish('k1')
        const next = vi.fn()
        swap({ onFileProcessed: next })

        act(() => {
            FakeEventSource.instances[0]!.emit('{"status":"done"}')
        })

        expect(next).toHaveBeenCalledTimes(1)
        expect(first).not.toHaveBeenCalled()
    })

    it('listens for a handler that was absent at mount and added later', () => {
        const { finish, swap } = mountController({})
        const late = vi.fn()
        swap({ onFileProcessed: late })

        finish('k1')
        act(() => {
            FakeEventSource.instances[0]!.emit('{"status":"done"}')
        })

        expect(late).toHaveBeenCalledTimes(1)
    })

    it('opens no stream while there is no handler', () => {
        const { finish } = mountController({})

        finish('k1')

        expect(FakeEventSource.instances).toHaveLength(0)
    })
})
