import { describe, it, expect, vi, afterEach } from 'vitest'
import { cleanup } from '@testing-library/svelte'
import { UpupCore } from '@upupjs/core'
import type { UploadFile } from '@upupjs/core'
import { withSetup } from './helpers'

afterEach(() => cleanup())

// P6 core-state/event contract (CLAUDE.md): "the core event surface has
// exactly ONE [failure event] — 'upload-error'; the bare 'error' event is
// retired." useUpupUpload's onMount block (packages/svelte/src/use-upup-
// upload.ts) wires a small core.on(...) forwarding table to its onXxx
// options (this composable has no createEventDispatcher/dispatch() surface —
// "svelte callbacks" in this file's name means the onXxx callback options).
// This pins that table's exact shape and its "no bare error" negative,
// parity with react's use-upup-upload-events.test.ts.
describe('useUpupUpload — core events forward to svelte callback options (P6 forwarding table)', () => {
    it('forwards core "files-added" to onFileAdded with its payload', () => {
        const onFileAdded = vi.fn()
        const { result, unmount } = withSetup({ limit: 5, onFileAdded })
        const payload: UploadFile[] = []
        result.core.emit('files-added', payload)
        expect(onFileAdded).toHaveBeenCalledWith(payload)
        unmount()
    })

    it('forwards core "file-removed" to onFileRemoved with its payload', () => {
        const onFileRemoved = vi.fn()
        const { result, unmount } = withSetup({ limit: 5, onFileRemoved })
        const payload = { id: 'f1' } as unknown as UploadFile
        result.core.emit('file-removed', payload)
        expect(onFileRemoved).toHaveBeenCalledWith(payload)
        unmount()
    })

    it('forwards core "upload-progress" to onUploadProgress with its payload', () => {
        const onUploadProgress = vi.fn()
        const { result, unmount } = withSetup({ limit: 5, onUploadProgress })
        const payload = { fileId: 'f1', loaded: 1, total: 2 }
        result.core.emit('upload-progress', payload)
        expect(onUploadProgress).toHaveBeenCalledWith(payload)
        unmount()
    })

    it('forwards core "upload-all-complete" to onUploadComplete with its payload', () => {
        const onUploadComplete = vi.fn()
        const { result, unmount } = withSetup({ limit: 5, onUploadComplete })
        const payload: UploadFile[] = []
        result.core.emit('upload-all-complete', payload)
        expect(onUploadComplete).toHaveBeenCalledWith(payload)
        unmount()
    })

    it('subscribes to exactly the known channel set — no bare "error" entry', () => {
        // Spy on the prototype (not a specific instance) so the recorded calls
        // are read directly from useUpupUpload's real core.on(...) call sites,
        // not a hand-copied list that could drift from source.
        const onSpy = vi.spyOn(UpupCore.prototype, 'on')
        const { unmount } = withSetup({
            limit: 5,
            onFileAdded: vi.fn(),
            onFileRemoved: vi.fn(),
            onUploadProgress: vi.fn(),
            onUploadComplete: vi.fn(),
        })
        const subscribedEvents = onSpy.mock.calls.map(call => call[0])
        expect(new Set(subscribedEvents)).toEqual(
            new Set([
                'state-change',
                'files-added',
                'file-removed',
                'upload-progress',
                'upload-all-complete',
            ]),
        )
        // The retired second failure channel must not reappear here: the sole
        // upload-failure event is 'upload-error', and this composable does not
        // even forward that one to a callback — it forwards NO error channel.
        expect(subscribedEvents).not.toContain('error')
        expect(subscribedEvents).not.toContain('upload-error')
        onSpy.mockRestore()
        unmount()
    })

    it('upload-error may legitimately fire more than once (file-scoped, then run-scoped) — pin the channel name, not the count', () => {
        const events: unknown[] = []
        const { result, unmount } = withSetup({ limit: 5 })
        const unsub = result.core.on('upload-error', payload => {
            events.push(payload)
        })
        result.core.emit('upload-error', { error: new Error('file failed') })
        result.core.emit('upload-error', { error: new Error('run failed') })
        expect(events.length).toBe(2)
        unsub()
        unmount()
    })

    it('type-level pin: the core event catalog has no bare "error" key', () => {
        // No runtime assertion here by design — the value of this test is the
        // two @ts-expect-error directives below, which the test-tree
        // typecheck gate (packages/svelte's `tsconfig.test.json`, run via
        // svelte-check) enforces.
        const { result, unmount } = withSetup({ limit: 5 })
        // @ts-expect-error: 'error' is not `keyof CoreEvents`; only the
        // namespaced '<provider>:error' form and 'upload-error' are valid.
        // eslint-disable-next-line no-restricted-syntax -- deliberate probe of the retired bare-'error' channel; the P6 ban this rule enforces is exactly what this pin proves
        result.core.emit('error', {})
        // @ts-expect-error: same pin on the subscribe side.
        result.core.on('error', () => {})
        unmount()
    })
})
