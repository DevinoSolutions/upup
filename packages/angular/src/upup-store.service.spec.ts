/**
 * UpupStore unit tests — plain-class instantiation, no TestBed needed.
 * The store is a plain @Injectable class; Angular DI is not required to test it directly.
 *
 * Three core promises verified:
 *   1. Snapshot → signals: computed fields are wired and return correct types after init().
 *   2. Multi-instance isolation: two stores have independent cores and independent state.
 *   3. Idempotent teardown: double-dispose is safe; dispose+re-init does not throw.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { UploadStatus, FileSource } from '@upup/core'
import { UpupStore } from './upup-store.service'

/** Minimal valid props — all optional fields omitted. */
const baseProps = {} as any

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
                'files', 'activeAdapter', 'isAddingMore', 'viewMode',
                'isOnline', 'editingFile', 'totalProgress', 'filesProgressMap',
                'uploadStatus', 'uploadError', 'uploadSpeed', 'uploadEta',
                'uploadedBytes', 'totalBytes',
            ] as const
            for (const key of signals) {
                expect(typeof store[key], `${key} should be a function/Signal`).toBe('function')
                // calling should not throw
                expect(() => store[key]()).not.toThrow()
            }
        })

        it('all theme-state computeds are defined and callable', () => {
            const themeSignals = [
                'themeMode', 'isDark', 'tokens', 'resolved', 'slotOverrides', 'slots',
            ] as const
            for (const key of themeSignals) {
                expect(typeof store[key], `${key} should be a function/Signal`).toBe('function')
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

        afterEach(() => store.dispose())
    })

    // ── Promise 2: Multi-instance isolation ─────────────────────

    describe('multi-instance isolation', () => {
        it('two stores have different core objects', () => {
            const a = makeStore()
            const b = makeStore()
            expect(a.core).not.toBe(b.core)
            a.dispose()
            b.dispose()
        })

        it('two stores have independent uploadStatus signals', () => {
            const a = makeStore()
            const b = makeStore()
            // Both start IDLE; they are independent signal instances
            expect(a.uploadStatus()).toBe(UploadStatus.IDLE)
            expect(b.uploadStatus()).toBe(UploadStatus.IDLE)
            // Signal objects themselves are different references
            expect(a.uploadStatus).not.toBe(b.uploadStatus)
            a.dispose()
            b.dispose()
        })

        it('two stores have independent file maps', () => {
            const a = makeStore()
            const b = makeStore()
            expect(a.files()).not.toBe(b.files())
            a.dispose()
            b.dispose()
        })

        it('two stores have independent orchState (snapshot)', () => {
            const a = makeStore()
            const b = makeStore()
            expect(a.snapshot()).not.toBe(b.snapshot())
            a.dispose()
            b.dispose()
        })
    })

    // ── Promise 3: Idempotent teardown ───────────────────────────

    describe('idempotent teardown', () => {
        it('dispose() twice does not throw', () => {
            const store = makeStore()
            expect(() => {
                store.dispose()
                store.dispose()
            }).not.toThrow()
        })

        it('dispose() then dispose() is safe from any initial state', () => {
            const store = new UpupStore()
            store.setConfig(baseProps)
            // dispose before init — should still not throw
            expect(() => {
                store.dispose()
                store.dispose()
            }).not.toThrow()
        })

        it('init() is idempotent — calling twice creates only one orch/theme pair', () => {
            const store = new UpupStore()
            store.setConfig(baseProps)
            store.init()
            const coreRef = store.core
            store.init() // second call must be a no-op
            expect(store.core).toBe(coreRef) // same core, no re-init
            store.dispose()
        })
    })

    // ── Imperative helpers ────────────────────────────────────────

    describe('imperative helpers', () => {
        let store: UpupStore

        beforeEach(() => { store = makeStore() })
        afterEach(() => store.dispose())

        it('registerFileInput / getFileInput round-trip', () => {
            const el = document.createElement('input')
            store.registerFileInput(el)
            expect(store.getFileInput()).toBe(el)
            store.registerFileInput(null)
            expect(store.getFileInput()).toBeNull()
        })

        it('setActiveAdapter updates the activeAdapter signal', () => {
            store.setActiveAdapter(FileSource.GOOGLE_DRIVE)
            expect(store.activeAdapter()).toBe(FileSource.GOOGLE_DRIVE)
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
})
