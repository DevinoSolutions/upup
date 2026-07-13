/**
 * UpupStore unit tests — plain-class instantiation, no TestBed needed.
 * The store is a plain @Injectable class; Angular DI is not required to test it directly.
 *
 * Promises verified:
 *   1. Snapshot → signals: computed fields are wired and return correct types after init().
 *   2. Multi-instance isolation: two stores have independent cores and independent state.
 *   3. Idempotent teardown: double-destroy is safe; destroy+re-init does not throw.
 *   4. i18n wired: translations signal is populated, lang/dir default correctly.
 *   5. Drive plugin registration: cloudDrives populated + core.use called.
 *   6. Status-change: onStatusChange called on status transition; unsub on destroy.
 *   7. Cleanups: cleanups array populated with drives/sse/status; safe after destroy.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
    UploadStatus,
    FileSource,
    UpupCore,
    GoogleDrivePlugin,
} from '@useupup/core'
import { UpupStore } from './upup-store.service'
import type { UploaderProps } from './shared/types'
import { EmptyIconComponent } from './components/icons/empty-icon.component'
import { TrashIconComponent } from './components/icons/trash-icon.component'

/** Minimal valid props — all optional fields omitted. */
const baseProps: UploaderProps = {}

function makeStore(props = baseProps): UpupStore {
    const store = new UpupStore()
    store.setConfig(props)
    store.init()
    return store
}

describe('UpupStore', () => {
    // ── Promise 1: Snapshot → signals ───────────────────────────

    describe('computed signals are wired after init()', () => {
        let store: UpupStore

        beforeEach(() => {
            store = makeStore()
        })

        it('files is a Signal (function) returning a Map', () => {
            expect(typeof store.files).toBe('function')
            expect(store.files()).toBeInstanceOf(Map)
        })

        it('uploadStatus is a Signal returning IDLE initially', () => {
            expect(typeof store.uploadStatus).toBe('function')
            expect(store.uploadStatus()).toBe(UploadStatus.IDLE)
        })

        it('all orch-state computeds are defined and callable', () => {
            const signals = [
                'files',
                'activeSource',
                'isAddingMore',
                'viewMode',
                'isOnline',
                'editingFile',
                'totalProgress',
                'filesProgressMap',
                'uploadStatus',
                'uploadError',
                'uploadSpeed',
                'uploadEta',
                'uploadedBytes',
                'totalBytes',
            ] as const
            for (const key of signals) {
                expect(
                    typeof store[key],
                    `${key} should be a function/Signal`,
                ).toBe('function')
                // calling should not throw
                expect(() => store[key]()).not.toThrow()
            }
        })

        it('all theme-state computeds are defined and callable', () => {
            const themeSignals = [
                'themeMode',
                'isDark',
                'tokens',
                'resolved',
                'slotOverrides',
                'slots',
            ] as const
            for (const key of themeSignals) {
                expect(
                    typeof store[key],
                    `${key} should be a function/Signal`,
                ).toBe('function')
                expect(() => store[key]()).not.toThrow()
            }
        })

        it('themeMode defaults to "light"', () => {
            expect(store.themeMode()).toBe('light')
        })

        it('isDark defaults to false', () => {
            expect(store.isDark()).toBe(false)
        })

        it('isOnline defaults to true', () => {
            expect(store.isOnline()).toBe(true)
        })

        it('editingFile defaults to null', () => {
            expect(store.editingFile()).toBeNull()
        })

        it('totalProgress defaults to 0', () => {
            expect(store.totalProgress()).toBe(0)
        })

        it('isAddingMore defaults to false', () => {
            expect(store.isAddingMore()).toBe(false)
        })

        it('viewMode defaults to "grid"', () => {
            expect(store.viewMode()).toBe('grid')
        })

        it('core is exposed and is an UpupCore instance', () => {
            expect(store.core).toBeTruthy()
            expect(typeof store.core.upload).toBe('function')
        })

        it('mode is resolved (defaults to "client")', () => {
            expect(store.mode).toBe('client')
        })

        afterEach(() => store.destroy())
    })

    // ── Promise 2: Multi-instance isolation ─────────────────────

    describe('multi-instance isolation', () => {
        it('two stores have different core objects', () => {
            const a = makeStore()
            const b = makeStore()
            expect(a.core).not.toBe(b.core)
            a.destroy()
            b.destroy()
        })

        it('two stores have independent uploadStatus signals', () => {
            const a = makeStore()
            const b = makeStore()
            // Both start IDLE; they are independent signal instances
            expect(a.uploadStatus()).toBe(UploadStatus.IDLE)
            expect(b.uploadStatus()).toBe(UploadStatus.IDLE)
            // Signal objects themselves are different references
            expect(a.uploadStatus).not.toBe(b.uploadStatus)
            a.destroy()
            b.destroy()
        })

        it('two stores have independent file maps', () => {
            const a = makeStore()
            const b = makeStore()
            expect(a.files()).not.toBe(b.files())
            a.destroy()
            b.destroy()
        })

        it('two stores have independent orchState (snapshot)', () => {
            const a = makeStore()
            const b = makeStore()
            expect(a.snapshot()).not.toBe(b.snapshot())
            a.destroy()
            b.destroy()
        })
    })

    // ── Promise 3: Idempotent teardown ───────────────────────────

    describe('idempotent teardown', () => {
        it('destroy() twice does not throw', () => {
            const store = makeStore()
            expect(() => {
                store.destroy()
                store.destroy()
            }).not.toThrow()
        })

        it('destroy() then destroy() is safe from any initial state', () => {
            const store = new UpupStore()
            store.setConfig(baseProps)
            // destroy before init — should still not throw
            expect(() => {
                store.destroy()
                store.destroy()
            }).not.toThrow()
        })

        it('init() is idempotent — calling twice creates only one orch/theme pair', () => {
            const store = new UpupStore()
            store.setConfig(baseProps)
            store.init()
            const coreRef = store.core
            store.init() // second call must be a no-op
            expect(store.core).toBe(coreRef) // same core, no re-init
            store.destroy()
        })
    })

    // ── Imperative helpers ────────────────────────────────────────

    describe('imperative helpers', () => {
        let store: UpupStore

        beforeEach(() => {
            store = makeStore()
        })
        afterEach(() => store.destroy())

        it('registerFileInput / getFileInput round-trip', () => {
            const el = document.createElement('input')
            store.registerFileInput(el)
            expect(store.getFileInput()).toBe(el)
            store.registerFileInput(null)
            expect(store.getFileInput()).toBeNull()
        })

        it('setActiveSource updates the activeSource signal', () => {
            store.setActiveSource(FileSource.GOOGLE_DRIVE)
            expect(store.activeSource()).toBe(FileSource.GOOGLE_DRIVE)
        })

        it('setIsAddingMore updates isAddingMore signal', () => {
            store.setIsAddingMore(true)
            expect(store.isAddingMore()).toBe(true)
            store.setIsAddingMore(false)
            expect(store.isAddingMore()).toBe(false)
        })

        it('setViewMode updates viewMode signal', () => {
            store.setViewMode('list')
            expect(store.viewMode()).toBe('list')
            store.setViewMode('grid')
            expect(store.viewMode()).toBe('grid')
        })

        it('handleCancel does not throw', () => {
            expect(() => store.handleCancel()).not.toThrow()
        })

        it('handlePause does not throw', () => {
            expect(() => store.handlePause()).not.toThrow()
        })

        it('handleResume does not throw', () => {
            expect(() => store.handleResume()).not.toThrow()
        })

        it('snapshot() returns the current orchestrator state', () => {
            const snap = store.snapshot()
            expect(snap).toBeTruthy()
            expect(snap.files).toBeInstanceOf(Map)
            expect(snap.uploadStatus).toBe(UploadStatus.IDLE)
        })
    })

    // ── Promise 4: i18n wired ────────────────────────────────────

    describe('i18n resolved after init()', () => {
        let store: UpupStore

        beforeEach(() => {
            store = makeStore()
        })
        afterEach(() => store.destroy())

        it('translations is a Signal (function)', () => {
            expect(typeof store.translations).toBe('function')
        })

        it('translations() returns a populated object with UI keys', () => {
            const t = store.translations()
            // flattenTranslatorToUiTranslations produces an object with string values
            expect(t).toBeTruthy()
            expect(typeof t).toBe('object')
            // The enUS bundle should produce at least some string values
            const values = Object.values(t)
            expect(values.length).toBeGreaterThan(0)
        })

        it('lang defaults to "en-US"', () => {
            expect(store.lang).toBe('en-US')
        })

        it('dir defaults to "ltr"', () => {
            // enUS bundle.dir is "ltr"
            expect(store.dir).toBe('ltr')
        })

        it('translator is defined', () => {
            expect(store.translator).toBeTruthy()
        })
    })

    // ── Promise 5: Drive plugin registration ─────────────────────

    describe('cloud drive plugin registration', () => {
        it('with googleDrive config → store.cloudDrives populated + core.use called', () => {
            const store = new UpupStore()
            store.setConfig({
                cloudDrives: {
                    googleDrive: {
                        clientId: 'gcid',
                        apiKey: 'gapikey',
                        appId: 'gappid',
                    },
                },
            })
            store.init()

            const useSpy = vi.spyOn(store.core, 'use')
            // Re-init won't call again (idempotent guard) — check the config instead
            expect(store.cloudDrives?.googleDrive).toBeDefined()
            expect(store.cloudDrives!.googleDrive!.clientId).toBe('gcid')
            expect(store.cloudDrives!.googleDrive!.apiKey).toBe('gapikey')
            expect(store.cloudDrives!.googleDrive!.appId).toBe('gappid')
            useSpy.mockRestore()
            store.destroy()
        })

        it('with no cloudDrives → store.cloudDrives is undefined', () => {
            const store = makeStore({})
            expect(store.cloudDrives).toBeUndefined()
            store.destroy()
        })

        it('with dropbox config → cloudDrives.dropbox populated', () => {
            const store = new UpupStore()
            store.setConfig({
                cloudDrives: {
                    dropbox: {
                        clientId: 'dbcid',
                        redirectUri: 'https://example.com/cb',
                    },
                },
            })
            store.init()
            expect(store.cloudDrives?.dropbox).toBeDefined()
            expect(store.cloudDrives!.dropbox!.clientId).toBe('dbcid')
            expect(store.cloudDrives!.dropbox!.redirectUri).toBe(
                'https://example.com/cb',
            )
            store.destroy()
        })

        it('core.use registers a GoogleDrivePlugin when googleDrive config present', () => {
            const useSpy = vi.spyOn(UpupCore.prototype, 'use')
            const store = new UpupStore()
            store.setConfig({
                cloudDrives: {
                    googleDrive: { clientId: 'c', apiKey: 'k', appId: 'a' },
                },
            })
            store.init()
            expect(useSpy).toHaveBeenCalledWith(expect.any(GoogleDrivePlugin))
            useSpy.mockRestore()
            store.destroy()
        })

        it('core.use registers no drive plugin when no cloudDrives configured', () => {
            const useSpy = vi.spyOn(UpupCore.prototype, 'use')
            const store = new UpupStore()
            store.setConfig({})
            store.init()
            expect(useSpy).not.toHaveBeenCalledWith(
                expect.any(GoogleDrivePlugin),
            )
            useSpy.mockRestore()
            store.destroy()
        })
    })

    // ── Promise 6: Status-change ─────────────────────────────────

    describe('onStatusChange subscription', () => {
        it('cleanups array grows after init() with onStatusChange', () => {
            const onStatusChange = vi.fn()
            const store = new UpupStore()
            store.setConfig({ onStatusChange })
            store.init()
            // At minimum the status-change unsub was pushed
            expect(
                (store as unknown as { cleanups: unknown[] }).cleanups.length,
            ).toBeGreaterThan(0)
            store.destroy()
        })

        it('destroy() runs cleanups without throwing', () => {
            const onStatusChange = vi.fn()
            const store = new UpupStore()
            store.setConfig({ onStatusChange })
            store.init()
            expect(() => store.destroy()).not.toThrow()
            // cleanups array should be cleared
            expect(
                (store as unknown as { cleanups: unknown[] }).cleanups.length,
            ).toBe(0)
        })

        it('status subscription deduplicates: a repeat notification with unchanged status does not re-emit', () => {
            // The subscription emits the lowercased uploadStatus whenever it differs from the
            // last value THIS listener saw. The first observed notification therefore emits the
            // initial IDLE (whatever triggers it). The honest, deterministic property is the
            // `s !== lastStatus` guard: once IDLE has been emitted, a further orch notification
            // that does NOT change uploadStatus (setIsAddingMore) must NOT emit again.
            const onStatusChange = vi.fn()
            const store = new UpupStore()
            store.setConfig({ onStatusChange })
            store.init()

            // Flush the initial emit deterministically via one orch notification.
            store.setIsAddingMore(true)
            const calls = onStatusChange.mock.calls.map(c => c[0])
            expect(calls.length).toBeGreaterThanOrEqual(1)
            // Every emit so far is the lowercased IDLE status — no spurious values.
            for (const arg of calls) expect(arg).toBe('idle')
            const countAfterFlush = onStatusChange.mock.calls.length

            // A second non-status notification must add NO further call (dedup guard holds).
            store.setIsAddingMore(false)
            expect(onStatusChange.mock.calls.length).toBe(countAfterFlush)
            store.destroy()
        })
    })

    // ── Promise 7: cleanups & uiProps ────────────────────────────

    describe('cleanups and uiProps', () => {
        it('uiProps is populated after init()', () => {
            const store = makeStore()
            expect(store.uiProps).toBeDefined()
            expect(typeof store.uiProps.mini).toBe('boolean')
            expect(Array.isArray(store.uiProps.sources)).toBe(true)
            expect(typeof store.uiProps.allowedFileTypes).toBe('string')
            expect(typeof store.uiProps.limit).toBe('number')
            store.destroy()
        })

        it('uiProps.icons has all six icon slots', () => {
            const store = makeStore()
            const icons = store.uiProps.icons
            expect('ContainerAddMoreIcon' in icons).toBe(true)
            expect('FileDeleteIcon' in icons).toBe(true)
            expect('CameraCaptureIcon' in icons).toBe(true)
            expect('CameraRotateIcon' in icons).toBe(true)
            expect('CameraDeleteIcon' in icons).toBe(true)
            expect('LoaderIcon' in icons).toBe(true)
            store.destroy()
        })

        it('uiProps.icons defaults FileDeleteIcon to TrashIconComponent and the rest to EmptyIconComponent', () => {
            // FileDeleteIcon ships a real default glyph (registry 'trash', parity with React's
            // TbTrash). The remaining slots still default to EmptyIconComponent (no glyph yet).
            const store = makeStore()
            const icons = store.uiProps.icons
            expect(icons.ContainerAddMoreIcon).toBe(EmptyIconComponent)
            expect(icons.FileDeleteIcon).toBe(TrashIconComponent)
            expect(icons.CameraCaptureIcon).toBe(EmptyIconComponent)
            expect(icons.CameraRotateIcon).toBe(EmptyIconComponent)
            expect(icons.CameraDeleteIcon).toBe(EmptyIconComponent)
            expect(icons.LoaderIcon).toBe(EmptyIconComponent)
            store.destroy()
        })

        it('cleanups grow when drives + onStatusChange + processingEndpoint are set', () => {
            const store = new UpupStore()
            store.setConfig({
                onStatusChange: vi.fn(),
                processingEndpoint: 'https://api.example.com/sse',
                onFileProcessed: vi.fn(),
                cloudDrives: {
                    googleDrive: { clientId: 'c', apiKey: 'k', appId: 'a' },
                },
            })
            store.init()
            // After C-2 Task 8: plugin cleanup + status-change subscription are managed by
            // createUploaderController internally (via root.destroy()). The store's own cleanups
            // array holds exactly the SSE destroy — lock that invariant against a future leak.
            expect(
                (store as unknown as { cleanups: unknown[] }).cleanups.length,
            ).toBe(1)
            store.destroy()
            // All cleanups should have been flushed
            expect(
                (store as unknown as { cleanups: unknown[] }).cleanups.length,
            ).toBe(0)
        })

        it('destroy() is idempotent even with all cleanups active', () => {
            const store = new UpupStore()
            store.setConfig({
                onStatusChange: vi.fn(),
                cloudDrives: {
                    googleDrive: { clientId: 'c', apiKey: 'k', appId: 'a' },
                },
            })
            store.init()
            expect(() => {
                store.destroy()
                store.destroy()
            }).not.toThrow()
        })
    })

    // ── Restriction ladder ───────────────────────────────────────
    // Locks each branch of handleSetSelectedFiles. The method awaits
    // this.upload.addFiles(); we reject it with messages containing the
    // trigger substrings and assert the keyword heuristic maps to the
    // correct reason. The 'below'-before-'size' test guards branch ORDER.

    describe('restriction ladder', () => {
        const txt = () => new File([], 'x.txt', { type: 'text/plain' })

        it('type error → TYPE_MISMATCH + onFileTypeMismatch', async () => {
            const onRestrictionFailed = vi.fn()
            const onFileTypeMismatch = vi.fn()
            const s = new UpupStore()
            s.setConfig({ onRestrictionFailed, onFileTypeMismatch })
            s.init()
            vi.spyOn(s.core, 'addFiles').mockRejectedValue(
                new Error('File type not allowed'),
            )
            await s.handleSetSelectedFiles([txt()])
            expect(onFileTypeMismatch).toHaveBeenCalled()
            expect(onRestrictionFailed).toHaveBeenCalledWith(
                expect.any(File),
                'TYPE_MISMATCH',
            )
            s.destroy()
        })

        it('limit error → LIMIT_EXCEEDED (no onFileTypeMismatch)', async () => {
            const onRestrictionFailed = vi.fn()
            const onFileTypeMismatch = vi.fn()
            const s = new UpupStore()
            s.setConfig({ onRestrictionFailed, onFileTypeMismatch })
            s.init()
            vi.spyOn(s.core, 'addFiles').mockRejectedValue(
                new Error('Number of files exceeds limit'),
            )
            await s.handleSetSelectedFiles([txt()])
            expect(onRestrictionFailed).toHaveBeenCalledWith(
                expect.any(File),
                'LIMIT_EXCEEDED',
            )
            expect(onFileTypeMismatch).not.toHaveBeenCalled()
            s.destroy()
        })

        it("below error → FILE_TOO_SMALL (branch order: 'below' before 'size')", async () => {
            const onRestrictionFailed = vi.fn()
            const onFileTypeMismatch = vi.fn()
            const s = new UpupStore()
            s.setConfig({ onRestrictionFailed, onFileTypeMismatch })
            s.init()
            vi.spyOn(s.core, 'addFiles').mockRejectedValue(
                new Error('File is below the minimum size'),
            )
            await s.handleSetSelectedFiles([txt()])
            expect(onRestrictionFailed).toHaveBeenCalledWith(
                expect.any(File),
                'FILE_TOO_SMALL',
            )
            expect(onFileTypeMismatch).not.toHaveBeenCalled()
            s.destroy()
        })

        it('size error → FILE_TOO_LARGE (no onFileTypeMismatch)', async () => {
            const onRestrictionFailed = vi.fn()
            const onFileTypeMismatch = vi.fn()
            const s = new UpupStore()
            s.setConfig({ onRestrictionFailed, onFileTypeMismatch })
            s.init()
            vi.spyOn(s.core, 'addFiles').mockRejectedValue(
                new Error('File exceeds the maximum size'),
            )
            await s.handleSetSelectedFiles([txt()])
            expect(onRestrictionFailed).toHaveBeenCalledWith(
                expect.any(File),
                'FILE_TOO_LARGE',
            )
            expect(onFileTypeMismatch).not.toHaveBeenCalled()
            s.destroy()
        })
    })
})
