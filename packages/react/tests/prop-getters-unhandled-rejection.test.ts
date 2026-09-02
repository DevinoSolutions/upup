import { describe, it, expect, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useUpupUpload } from '../src/use-upup-upload'

// Issue #342 — core's addFiles() emits `restriction-failed` and then RETHROWS.
// The rethrow is deliberate (direct `await core.addFiles()` callers narrow on it),
// but the headless surface reaches addFiles from three FIRE-AND-FORGET DOM
// callbacks — the hidden input's onChange, and DragDropController's drop/paste,
// whose setFiles dep in useUpupUpload is core.addFiles itself. Nothing awaits
// those promises, so every ordinary user-facing restriction failure ALSO
// surfaced as an unhandled promise rejection (Sentry noise for a handled event).
//
// The contract these tests pin: on a fire-and-forget path the rejection is
// swallowed, because `restriction-failed` has ALREADY carried the same error to
// the event bus — core emits it before it rethrows, so nothing is lost. The
// visual panels never had this bug: their setFiles routes through
// createUploaderController's handleSetSelectedFiles, which try/catches.

type RejectionListener = (reason: unknown) => void

/**
 * Vitest runs on Node even under the jsdom environment, but @types/node is not
 * in this package's test tsconfig — so reach the process object through a local
 * structural type instead of widening the package's global types for one file.
 */
interface NodeProcessLike {
    on(event: 'unhandledRejection', listener: RejectionListener): void
    off(event: 'unhandledRejection', listener: RejectionListener): void
}
const nodeProcess = (globalThis as unknown as { process: NodeProcessLike })
    .process

/**
 * Node's default unhandled-rejection mode is `throw`, which is bypassed as soon
 * as an 'unhandledRejection' listener exists — so registering one both captures
 * the event and keeps a RED run from taking the whole worker down.
 */
function captureUnhandledRejections() {
    const seen: unknown[] = []
    const listener: RejectionListener = reason => {
        seen.push(reason)
    }
    nodeProcess.on('unhandledRejection', listener)
    return {
        seen,
        /** Node decides a rejection is unhandled only after the microtask queue
         *  drains; two macrotask turns is the window it needs to emit. */
        async settle() {
            await new Promise(resolve => setTimeout(resolve, 0))
            await new Promise(resolve => setTimeout(resolve, 0))
        },
        stop() {
            nodeProcess.off('unhandledRejection', listener)
        },
    }
}

let capture: ReturnType<typeof captureUnhandledRejections> | null = null

afterEach(() => {
    capture?.stop()
    capture = null
})

/** An options bag whose only restriction is a type filter the test files fail. */
const IMAGES_ONLY = {
    provider: 'S3' as const,
    allowedFileTypes: 'image/*',
    enablePaste: true,
}

const REJECTED_FILE = () => new File(['x'], 'notes.txt', { type: 'text/plain' })

function makeChangeEvent(files: File[]) {
    return {
        target: { files },
    } as unknown as React.ChangeEvent<HTMLInputElement>
}

function makeDragEvent(files: File[]) {
    return {
        preventDefault: () => {},
        dataTransfer: {
            dropEffect: '',
            files,
            items: files.map(f => ({
                kind: 'file',
                webkitGetAsEntry: () => null,
                getAsFile: () => f,
            })),
        },
    } as unknown as React.DragEvent<HTMLElement>
}

function makeClipboardEvent(files: File[]) {
    return {
        preventDefault: () => {},
        clipboardData: {
            items: files.map(f => ({ kind: 'file', getAsFile: () => f })),
        },
    } as unknown as React.ClipboardEvent<HTMLElement>
}

describe('useUpupUpload — restriction failures on fire-and-forget paths (#342)', () => {
    it('getInputProps().onChange does not raise an unhandled rejection', async () => {
        capture = captureUnhandledRejections()
        const { result } = renderHook(() => useUpupUpload(IMAGES_ONLY))

        await act(async () => {
            result.current.getInputProps().onChange!(
                makeChangeEvent([REJECTED_FILE()]),
            )
        })
        await capture.settle()

        expect(capture.seen).toEqual([])
        expect(result.current.files.length).toBe(0)
    })

    it('getDropzoneProps().onDrop does not raise an unhandled rejection', async () => {
        capture = captureUnhandledRejections()
        const { result } = renderHook(() => useUpupUpload(IMAGES_ONLY))

        await act(async () => {
            result.current.getDropzoneProps().onDrop!(
                makeDragEvent([REJECTED_FILE()]),
            )
        })
        await capture.settle()

        expect(capture.seen).toEqual([])
        expect(result.current.files.length).toBe(0)
    })

    it('getDropzoneProps().onPaste does not raise an unhandled rejection', async () => {
        capture = captureUnhandledRejections()
        const { result } = renderHook(() => useUpupUpload(IMAGES_ONLY))

        await act(async () => {
            result.current.getDropzoneProps().onPaste!(
                makeClipboardEvent([REJECTED_FILE()]),
            )
        })
        await capture.settle()

        expect(capture.seen).toEqual([])
        expect(result.current.files.length).toBe(0)
    })

    it('still emits restriction-failed carrying the error the rejection would have carried', async () => {
        capture = captureUnhandledRejections()
        const seenErrors: unknown[] = []
        const { result } = renderHook(() => useUpupUpload(IMAGES_ONLY))

        act(() => {
            result.current.on('restriction-failed', payload => {
                seenErrors.push(payload.error)
            })
        })
        await act(async () => {
            result.current.getInputProps().onChange!(
                makeChangeEvent([REJECTED_FILE()]),
            )
        })
        await capture.settle()

        expect(capture.seen).toEqual([])
        expect(seenErrors.length).toBe(1)
        expect(seenErrors[0]).toBeInstanceOf(Error)
    })

    it('leaves a DIRECT await core.addFiles() rejection intact (the rethrow is deliberate)', async () => {
        const { result } = renderHook(() => useUpupUpload(IMAGES_ONLY))

        await expect(
            result.current.addFiles([REJECTED_FILE()]),
        ).rejects.toThrow()
    })
})
