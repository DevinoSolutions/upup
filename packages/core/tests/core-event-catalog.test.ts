import { describe, it, expect, expectTypeOf, vi } from 'vitest'
import { UpupCore } from '../src/core'
import type { CoreEvents } from '../src/types/core-events'

/**
 * Catalog pin, re-expressed for F-800/F-840: the checked-in list below must
 * stay EXACTLY equal to `keyof CoreEvents` in both directions — the typed
 * emit/on surface (F-723) is the single source of truth for bare event names,
 * so an event silently added to or removed from CoreEvents turns this test
 * red until the list is updated deliberately (same discipline as the
 * public-api pins).
 *
 * History: the previous version of this file round-tripped ~110 hand-listed
 * strings through the then-untyped emit overload — a tautology that passed
 * for ANY string and pinned ~60 event names core never emitted (F-800).
 * Namespaced drive events ('<provider>:<event>') are dynamic by design and
 * pinned separately below.
 */
const CORE_EVENT_CATALOG = [
    // State + lifecycle
    'state-change',
    'snapshot-restored',
    'crash-recovery-restored',
    'options-updated',
    'plugin-registered',
    'destroyed',
    // Files
    'files-added',
    'file-removed',
    'file-rejected',
    'file-replaced',
    'files-cleared',
    'files-set',
    'files-reordered',
    'restriction-failed',
    // Upload flow
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
    // UI flow (orchestrator/controller)
    'done',
    'state-reset',
    'auto-upload',
    'connection-online',
    'connection-offline',
    // Image editor
    'image-editor-open',
    'image-editor-cancel',
    'image-editor-save',
    // Drag/drop + paste
    'drag-over',
    'drag-leave',
    'drop',
    'folder-drop-blocked',
    'paste',
    // Pipeline diagnostics
    'pipeline-start',
    'pipeline-step',
    'pipeline-complete',
    'pipeline-error',
    // UI telemetry (framework ports; react payload canon)
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

type CatalogKey = (typeof CORE_EVENT_CATALOG)[number]

describe('UpupCore — event catalog', () => {
    it('catalog is exactly keyof CoreEvents (both directions)', () => {
        // A key present in CoreEvents but missing here — or listed here but
        // gone from CoreEvents — fails the test-tree typecheck gate.
        expectTypeOf<CatalogKey>().toEqualTypeOf<keyof CoreEvents>()
        expect(CORE_EVENT_CATALOG.length).toBeGreaterThan(0)
    })

    it('catalog entries are unique', () => {
        expect(new Set(CORE_EVENT_CATALOG).size).toBe(CORE_EVENT_CATALOG.length)
    })

    it('typed on()/emit() dispatch + unsubscribe round-trip', () => {
        const core = new UpupCore({})
        const received: unknown[] = []
        const unsub = core.on('files-set', payload => {
            received.push(payload)
        })
        core.emit('files-set', { count: 2 })
        expect(received).toEqual([{ count: 2 }])
        unsub()
        core.emit('files-set', { count: 3 })
        expect(received).toHaveLength(1)
        core.destroy()
    })

    it('unknown bare event names are compile errors on the typed surface', () => {
        const core = new UpupCore({})
        // @ts-expect-error — 'not-a-real-event' is not in CoreEvents (F-723)
        core.on('not-a-real-event', () => {})
        // @ts-expect-error — bare emits must come from the catalog
        core.emit('not-a-real-event', {})
        core.destroy()
    })

    it("namespaced drive-plugin events ('<provider>:<event>') pass through dynamically", () => {
        const core = new UpupCore({})
        const handler = vi.fn()
        const unsub = core.on('google-drive:files-loaded', handler)
        core.emit('google-drive:files-loaded', { files: [] })
        expect(handler).toHaveBeenCalledWith({ files: [] })
        unsub()
        core.emit('google-drive:files-loaded', { files: [] })
        expect(handler).toHaveBeenCalledTimes(1)
        core.destroy()
    })
})
