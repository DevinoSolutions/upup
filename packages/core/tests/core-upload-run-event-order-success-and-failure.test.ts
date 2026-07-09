import { describe, it, expect, afterEach, vi } from 'vitest'
import { UpupCore } from '../src/core'
import { UploadStatus } from '@upup/core'

/**
 * Every other core-event test pins the catalog (core-event-catalog.test.ts)
 * or an individual payload shape (events.test.ts, core-lifecycle-events.test.ts,
 * core-status-transitions.test.ts, ...) in isolation. None of them assert the
 * SEQUENCE a real run actually produces end-to-end — this file closes that gap.
 *
 * It drives `core.upload()` through the real pipeline (stubbed presign fetch +
 * stubbed XHR PUT, same technique as core-upload-targets.test.ts) for one
 * successful and one failing single-file run, recording every event core
 * emits, in order, via a recorder subscribed to the full event catalog. It
 * pins, as an OBSERVABLE SEQUENCE rather than a design-doc claim:
 *   - the single-flight run's relative event order: files-added → upload-start
 *     → file-upload-start → upload-progress → upload-success →
 *     upload-all-complete, each paired with the state-change core emits
 *     alongside it (P6).
 *   - P6's "one upload-failure CHANNEL" ruling read literally: 'upload-error'
 *     is the only failure event NAME that ever fires — a bare 'error' never
 *     does — and the terminal state-change reflects UploadStatus.FAILED.
 *   - the success and failure runs share an identical prefix up to the point
 *     where the single file's upload attempt actually resolves.
 */

// Mirrors the pinned catalog in core-event-catalog.test.ts (F-800/F-840) —
// duplicated here because this file needs the concrete values at RUNTIME to
// subscribe a recorder, whereas the catalog test only needs them at the type
// level via `keyof CoreEvents`. Keep in lockstep with that file's
// CORE_EVENT_CATALOG if the catalog ever changes.
const ALL_CATALOG_EVENTS = [
    'state-change',
    'snapshot-restored',
    'crash-recovery-restored',
    'options-updated',
    'plugin-registered',
    'destroyed',
    'files-added',
    'file-removed',
    'file-rejected',
    'file-replaced',
    'files-cleared',
    'files-set',
    'files-reordered',
    'restriction-failed',
    'upload-start',
    'file-upload-start',
    'upload-progress',
    'upload-success',
    'upload-error',
    'upload-all-complete',
    'upload-pause',
    'upload-resume',
    'upload-cancel',
    'retry',
    'done',
    'state-reset',
    'auto-upload',
    'connection-online',
    'connection-offline',
    'image-editor-open',
    'image-editor-cancel',
    'image-editor-save',
    'drag-over',
    'drag-leave',
    'drop',
    'folder-drop-blocked',
    'paste',
    'pipeline-start',
    'pipeline-step',
    'pipeline-complete',
    'pipeline-error',
    'source-click',
    'source-view-cancel',
    'browse-files',
    'folder-select',
    'url-submit',
    'url-fetch',
    'url-fetch-cancel',
    'camera-capture',
    'camera-confirm',
    'file-preview-open',
    'file-preview-close',
] as const

interface RecordedEvent {
    event: string
    payload: unknown
}

// Test-only escape hatch: UpupCore.on()'s public overloads only accept a
// `keyof CoreEvents` literal or a `${string}:${string}` namespaced form (see
// core.ts), so a generic loop over ALL_CATALOG_EVENTS — and the deliberate
// bare-'error' probe below, which must NOT type-check on the public surface —
// need the underlying untyped signature. Same escape-hatch pattern
// core-event-catalog.test.ts uses via `@ts-expect-error` for a single call;
// this is the same cast applied once so it can be used in a loop.
type AnyOn = (event: string, handler: (payload: unknown) => void) => () => void

/** Subscribes one recorder to every catalog event (plus a bare-'error' safety
 *  net) and records them, in emission order, with their payloads. */
function recordAllEvents(core: UpupCore): {
    events: RecordedEvent[]
    detach: () => void
} {
    const events: RecordedEvent[] = []
    const onAny = core.on.bind(core) as unknown as AnyOn

    const unsubs = ALL_CATALOG_EVENTS.map(name =>
        onAny(name, payload => {
            events.push({ event: name, payload })
        }),
    )

    // Safety net: bare 'error' is deliberately NOT a CoreEvents key — P6
    // retired it in favor of 'upload-error' as the one failure channel.
    // Subscribing anyway means a regression that reintroduces it is caught
    // by THIS recording, not just inferred from its absence in the catalog.
    unsubs.push(
        onAny('error', payload => {
            events.push({ event: 'error', payload })
        }),
    )

    return {
        events,
        detach: () => unsubs.forEach(unsub => unsub()),
    }
}

// The subset of the catalog that constitutes the run's observable "shape" —
// everything else (drive events, UI telemetry, drag/drop, image editor, ...)
// is out of scope for what this file pins.
const LIFECYCLE_EVENTS = new Set([
    'files-added',
    'upload-start',
    'file-upload-start',
    'upload-progress',
    'upload-success',
    'upload-error',
    'upload-all-complete',
    'state-change',
])

/**
 * Collapses consecutive repeats of the same event name to a single
 * occurrence. Structural, not numeric: a run's exact upload-progress tick
 * count (and, incidentally, how many state-change writes land back-to-back
 * around a status transition) is an implementation detail that can shift
 * with unrelated refactors — collapsing keeps the assertion pinned to the
 * ORDER of distinct stages instead of a brittle count.
 */
function collapseConsecutive(names: string[]): string[] {
    return names.filter((name, i) => name !== names[i - 1])
}

function lifecycleSequence(events: RecordedEvent[]): string[] {
    return collapseConsecutive(
        events.map(e => e.event).filter(name => LIFECYCLE_EVENTS.has(name)),
    )
}

/** Same shape as core-upload-targets.test.ts's makeUploadXhr, extended with a
 *  triggerProgress hook (that file never needed one). */
function makeUploadXhr() {
    const listeners: Record<string, Array<(e?: unknown) => void>> = {}
    const uploadListeners: Record<string, Array<(e?: unknown) => void>> = {}
    return {
        status: 200,
        statusText: 'OK',
        responseText: '',
        open: vi.fn(),
        setRequestHeader: vi.fn(),
        send: vi.fn(),
        abort: vi.fn(),
        upload: {
            addEventListener: vi.fn(
                (event: string, cb: (e?: unknown) => void) => {
                    uploadListeners[event] = uploadListeners[event] ?? []
                    uploadListeners[event]!.push(cb)
                },
            ),
        },
        addEventListener: vi.fn((event: string, cb: (e?: unknown) => void) => {
            listeners[event] = listeners[event] ?? []
            listeners[event]!.push(cb)
        }),
        triggerProgress: (loaded: number, total: number) => {
            uploadListeners.progress?.forEach(cb =>
                cb({ lengthComputable: true, loaded, total }),
            )
        },
        triggerLoad: () => listeners.load?.forEach(cb => cb()),
    }
}

function stubPresignFetch(key: string) {
    vi.stubGlobal(
        'fetch',
        vi.fn(
            async () =>
                new Response(
                    JSON.stringify({
                        key,
                        uploadUrl: `https://storage.example/${key}`,
                        publicUrl: `https://cdn.example/${key}`,
                        expiresIn: 3600,
                    }),
                    {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' },
                    },
                ),
        ),
    )
}

/** Drives one successful single-file run through the real pipeline (stubbed
 *  network) and returns every event core emitted, in order. */
async function driveSuccessfulUpload(): Promise<RecordedEvent[]> {
    stubPresignFetch('uploads/hello.txt')
    const xhr = makeUploadXhr()
    vi.stubGlobal('XMLHttpRequest', function () {
        return xhr
    })

    const core = new UpupCore({ uploadEndpoint: '/api/presign' })
    const recorder = recordAllEvents(core)

    await core.addFiles([
        new File(['hello'], 'hello.txt', { type: 'text/plain' }),
    ])

    const uploadPromise = core.upload()
    await vi.waitFor(() => {
        expect(xhr.send).toHaveBeenCalled()
    })
    xhr.triggerProgress(3, 5)
    xhr.triggerLoad()
    await uploadPromise

    core.destroy()
    recorder.detach()
    vi.unstubAllGlobals()
    return recorder.events
}

/** Drives one failing single-file run (the XHR PUT resolves with a 500) and
 *  returns every event core emitted, in order. maxRetries: 0 keeps it a
 *  single deterministic attempt — no backoff timers to fake or wait out. */
async function driveFailingUpload(): Promise<RecordedEvent[]> {
    stubPresignFetch('uploads/fail.txt')
    const xhr = makeUploadXhr()
    vi.stubGlobal('XMLHttpRequest', function () {
        return xhr
    })

    const core = new UpupCore({
        uploadEndpoint: '/api/presign',
        maxRetries: 0,
    })
    const recorder = recordAllEvents(core)

    await core.addFiles([
        new File(['hello'], 'fail.txt', { type: 'text/plain' }),
    ])

    const uploadPromise = core.upload()
    await vi.waitFor(() => {
        expect(xhr.send).toHaveBeenCalled()
    })
    xhr.status = 500
    xhr.statusText = 'Internal Server Error'
    xhr.triggerLoad()

    await expect(uploadPromise).rejects.toThrow()

    core.destroy()
    recorder.detach()
    vi.unstubAllGlobals()
    return recorder.events
}

const SHARED_PREFIX = [
    'files-added',
    'state-change',
    'upload-start',
    'state-change',
    'file-upload-start',
    'state-change',
]

describe('UpupCore — upload run event order (success and failure)', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('a successful upload of one file walks files-added, upload-start, file-upload-start, progress, upload-success, upload-all-complete in order, each paired with a state-change', async () => {
        const events = await driveSuccessfulUpload()

        expect(lifecycleSequence(events)).toEqual([
            ...SHARED_PREFIX,
            'upload-progress',
            'state-change',
            'upload-success',
            'state-change',
            'upload-all-complete',
            'state-change',
        ])
    })

    it('a failing upload reports through the upload-error channel alone — file-scoped then run-scoped, never a bare error event', async () => {
        const events = await driveFailingUpload()

        // P6 bans a second failure CHANNEL, not a second emission: one failing
        // file yields exactly two upload-error emissions on the one channel —
        // the per-file report (`{file, error}`, core.ts onFileError) so a UI
        // can badge the file, then the run-terminal report (`{error}` only,
        // terminalRunFailure) so a UI can raise a run-level banner.
        const errorEvents = events.filter(e => e.event === 'upload-error')
        expect(errorEvents).toHaveLength(2)

        const fileScoped = errorEvents[0]!.payload as {
            file?: { name: string; status: UploadStatus }
            error: unknown
        }
        expect(fileScoped.file?.name).toBe('fail.txt')
        expect(fileScoped.file?.status).toBe(UploadStatus.FAILED)
        expect(fileScoped.error).toBeInstanceOf(Error)

        const runScoped = errorEvents[1]!.payload as {
            file?: unknown
            error: unknown
        }
        expect(runScoped.file).toBeUndefined()
        expect(runScoped.error).toBeInstanceOf(Error)

        // The retired bare 'error' channel stays dead (P6).
        expect(events.some(e => e.event === 'error')).toBe(false)

        const stateChanges = events.filter(e => e.event === 'state-change')
        const terminal = stateChanges[stateChanges.length - 1]!.payload as {
            status?: UploadStatus
        }
        expect(terminal.status).toBe(UploadStatus.FAILED)
    })

    it('the successful and failing runs share the same event prefix up to where the single upload attempt resolves', async () => {
        const successSeq = lifecycleSequence(await driveSuccessfulUpload())
        const failureSeq = lifecycleSequence(await driveFailingUpload())

        expect(successSeq.slice(0, SHARED_PREFIX.length)).toEqual(SHARED_PREFIX)
        expect(failureSeq.slice(0, SHARED_PREFIX.length)).toEqual(SHARED_PREFIX)

        // ...and pin what they diverge INTO, so this isn't a vacuous prefix
        // match against two otherwise-unrelated sequences.
        expect(successSeq[SHARED_PREFIX.length]).toBe('upload-progress')
        expect(failureSeq[SHARED_PREFIX.length]).toBe('upload-error')
    })
})
