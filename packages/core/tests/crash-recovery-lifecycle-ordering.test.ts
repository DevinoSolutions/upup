// Contract: crash-recovery persistence must never contradict what actually
// happened. Blob snapshots of large files make IndexedDB writes slow, so the
// storage layer's answers arrive out of order unless the core orders them —
// a save started before completion must not land after the completion clear
// and resurrect a finished upload as a resumable one. And a restored paused
// file must reopen at the byte offset its persisted multipart session proves
// was uploaded, not at 0 B.

import { describe, it, expect, vi, afterEach } from 'vitest'
import type { PersistentStorage } from '../src/crash-recovery'
import { UpupCore } from '../src/core'
import {
    fileFingerprint,
    saveSession,
} from '../src/utils/multipart-session-store'
import { FileSource, UploadStatus } from '@upupjs/core'

const STORAGE_KEY = 'upup-crash-recovery'
const SERVER_URL = 'https://api.example.com/upup'

/** Storage whose saves park until the test releases them — the deterministic
 *  stand-in for "IndexedDB is still writing a 700MB blob". Deletes stay
 *  instant, mirroring the real asymmetry that makes the race reachable. */
function makeDeferredSaveStorage() {
    const store = new Map<string, unknown>()
    const pendingSaves: Array<() => void> = []
    const storage = {
        store,
        pendingSaves,
        releaseNextSave() {
            pendingSaves.shift()?.()
        },
        get: vi.fn(async (key: string) => store.get(key)),
        set: vi.fn(
            (key: string, value: unknown) =>
                new Promise<void>(resolve => {
                    pendingSaves.push(() => {
                        store.set(key, value)
                        resolve()
                    })
                }),
        ),
        delete: vi.fn(async (key: string) => {
            store.delete(key)
        }),
    }
    return storage satisfies PersistentStorage & Record<string, unknown>
}

function makeInstantStorage() {
    const store = new Map<string, unknown>()
    return {
        store,
        get: vi.fn(async (key: string) => store.get(key)),
        set: vi.fn(async (key: string, value: unknown) => {
            store.set(key, value)
        }),
        delete: vi.fn(async (key: string) => {
            store.delete(key)
        }),
    }
}

/** Web Storage stand-in for the multipart session store under vitest's `node`
 *  environment. */
class MemoryStorage {
    private store = new Map<string, string>()

    getItem(key: string): string | null {
        return this.store.has(key) ? (this.store.get(key) as string) : null
    }
    setItem(key: string, value: string): void {
        this.store.set(key, value)
    }
    removeItem(key: string): void {
        this.store.delete(key)
    }
    clear(): void {
        this.store.clear()
    }
    key(index: number): string | null {
        return Array.from(this.store.keys())[index] ?? null
    }
    get length(): number {
        return this.store.size
    }
}

afterEach(() => {
    vi.unstubAllGlobals()
})

describe('crash-recovery write ordering', () => {
    it('a completion clear is never overtaken by a slower in-flight snapshot save (finished upload must not resurrect as resumable)', async () => {
        const storage = makeDeferredSaveStorage()
        const core = new UpupCore({ crashRecovery: { storage } })
        await core.addFiles([
            new File(['hello'], 'race.txt', { type: 'text/plain' }),
        ])

        // The snapshot save is now in flight and parked mid-write.
        await vi.waitFor(() => {
            expect(storage.set).toHaveBeenCalled()
        })

        // Completion arrives while that save is still writing.
        const file = [...core.files.values()][0]!
        Object.assign(file, {
            key: 'uploads/race.txt',
            status: UploadStatus.SUCCESSFUL,
        })
        core.restore({
            files: [[file.id, file]],
            status: UploadStatus.SUCCESSFUL,
        })

        // The slow save finally lands. Ordered writes must still end cleared;
        // unordered ones leave the stale snapshot as the last word.
        storage.releaseNextSave()
        await vi.waitFor(() => {
            expect(storage.store.has(STORAGE_KEY)).toBe(false)
        })
        expect(storage.pendingSaves.length).toBe(0)
        core.destroy()
    })

    it('state changes arriving while a snapshot save is in flight coalesce into one follow-up write instead of stacking a blob write per tick', async () => {
        const storage = makeDeferredSaveStorage()
        const core = new UpupCore({ crashRecovery: { storage } })
        await core.addFiles([
            new File(['a'], 'a.txt', { type: 'text/plain' }),
            new File(['b'], 'b.txt', { type: 'text/plain' }),
        ])

        await vi.waitFor(() => {
            expect(storage.set).toHaveBeenCalledTimes(1)
        })

        // Five rapid state changes while the first save is still writing.
        const ids = [...core.files.keys()]
        for (let i = 0; i < 5; i++) {
            core.reorderFiles([...ids].reverse())
        }
        expect(storage.set).toHaveBeenCalledTimes(1)

        // Releasing the first save lets the ONE coalesced follow-up run.
        storage.releaseNextSave()
        await vi.waitFor(() => {
            expect(storage.set).toHaveBeenCalledTimes(2)
        })
        storage.releaseNextSave()
        await Promise.resolve()
        expect(storage.set).toHaveBeenCalledTimes(2)
        core.destroy()
    })
})

describe('crash-recovery restore progress seeding', () => {
    function makeSnapshotFile(): File & {
        id: string
        source: FileSource
        status: UploadStatus
        metadata: Record<string, unknown>
    } {
        return Object.assign(
            new File([new Uint8Array(64)], 'seed.mp4', {
                type: 'video/mp4',
                lastModified: 1_700_000_000_000,
            }),
            {
                id: 'seed-1',
                source: FileSource.LOCAL,
                status: UploadStatus.UPLOADING,
                metadata: {},
            },
        )
    }

    it('replays the persisted session byte offset as upload-progress so a restored paused file does not display 0 B', async () => {
        vi.stubGlobal('localStorage', new MemoryStorage())
        const storage = makeInstantStorage()
        const file = makeSnapshotFile()
        storage.store.set(STORAGE_KEY, {
            files: [['seed-1', file]],
            status: UploadStatus.UPLOADING,
        })
        saveSession(fileFingerprint(file), {
            token: 'live-token',
            key: 'uploads/seed.mp4',
            partSize: 16,
            updatedAt: Date.now(),
            uploadedBytes: 48,
            scope: SERVER_URL,
        })

        const core = new UpupCore({
            serverUrl: SERVER_URL,
            crashRecovery: { storage },
        })
        const events: unknown[] = []
        core.on('upload-progress', (event: unknown) => {
            events.push(event)
        })

        await expect(core.restoreFromCrashRecovery()).resolves.toBe(true)
        expect(events).toEqual([{ fileId: 'seed-1', loaded: 48, total: 64 }])
        core.destroy()
    })

    it('ignores a session scoped to a different server — its offset belongs to an upload this core cannot resume', async () => {
        vi.stubGlobal('localStorage', new MemoryStorage())
        const storage = makeInstantStorage()
        const file = makeSnapshotFile()
        storage.store.set(STORAGE_KEY, {
            files: [['seed-1', file]],
            status: UploadStatus.UPLOADING,
        })
        saveSession(fileFingerprint(file), {
            token: 'foreign-token',
            key: 'uploads/seed.mp4',
            partSize: 16,
            updatedAt: Date.now(),
            uploadedBytes: 48,
            scope: 'https://other.example.com/upup',
        })

        const core = new UpupCore({
            serverUrl: SERVER_URL,
            crashRecovery: { storage },
        })
        const events: unknown[] = []
        core.on('upload-progress', (event: unknown) => {
            events.push(event)
        })

        await expect(core.restoreFromCrashRecovery()).resolves.toBe(true)
        expect(events).toEqual([])
        core.destroy()
    })

    it('drops an UPLOADING multipart-sized file whose session is gone — a completed upload whose snapshot clear lost the race with page death must not resurrect as resumable', async () => {
        vi.stubGlobal('localStorage', new MemoryStorage())
        const storage = makeInstantStorage()
        const file = makeSnapshotFile()
        storage.store.set(STORAGE_KEY, {
            files: [['seed-1', file]],
            status: UploadStatus.UPLOADING,
        })
        // No session saved: completion removed it synchronously before the
        // page died, but the async snapshot clear never landed.

        const core = new UpupCore({
            serverUrl: SERVER_URL,
            resumable: { protocol: 'multipart', thresholdBytes: 16 },
            crashRecovery: { storage },
        })

        await expect(core.restoreFromCrashRecovery()).resolves.toBe(false)
        expect(core.files.size).toBe(0)
        await vi.waitFor(() => {
            expect(storage.store.has(STORAGE_KEY)).toBe(false)
        })
        core.destroy()
    })

    it('keeps an UPLOADING multipart-sized file whose session survives — that is a genuinely crashed upload', async () => {
        vi.stubGlobal('localStorage', new MemoryStorage())
        const storage = makeInstantStorage()
        const file = makeSnapshotFile()
        storage.store.set(STORAGE_KEY, {
            files: [['seed-1', file]],
            status: UploadStatus.UPLOADING,
        })
        saveSession(fileFingerprint(file), {
            token: 'live-token',
            key: 'uploads/seed.mp4',
            partSize: 16,
            updatedAt: Date.now(),
            uploadedBytes: 32,
            scope: SERVER_URL,
        })

        const core = new UpupCore({
            serverUrl: SERVER_URL,
            resumable: { protocol: 'multipart', thresholdBytes: 16 },
            crashRecovery: { storage },
        })

        await expect(core.restoreFromCrashRecovery()).resolves.toBe(true)
        expect(core.files.get('seed-1')?.status).toBe(UploadStatus.PAUSED)
        core.destroy()
    })

    it('keeps a session-less file below the multipart threshold — small files never have sessions and must stay restorable', async () => {
        vi.stubGlobal('localStorage', new MemoryStorage())
        const storage = makeInstantStorage()
        const file = makeSnapshotFile()
        storage.store.set(STORAGE_KEY, {
            files: [['seed-1', file]],
            status: UploadStatus.UPLOADING,
        })

        const core = new UpupCore({
            serverUrl: SERVER_URL,
            // 64-byte snapshot file sits below the default 5 MiB threshold.
            resumable: { protocol: 'multipart' },
            crashRecovery: { storage },
        })

        await expect(core.restoreFromCrashRecovery()).resolves.toBe(true)
        expect(core.files.get('seed-1')?.status).toBe(UploadStatus.PAUSED)
        core.destroy()
    })

    it('keeps a session-less PROCESSING file — the crash predates init, so no session ever existed', async () => {
        vi.stubGlobal('localStorage', new MemoryStorage())
        const storage = makeInstantStorage()
        const file = Object.assign(
            new File([new Uint8Array(64)], 'seed.mp4', {
                type: 'video/mp4',
                lastModified: 1_700_000_000_000,
            }),
            {
                id: 'seed-1',
                source: FileSource.LOCAL,
                status: UploadStatus.PROCESSING,
                metadata: {},
            },
        )
        storage.store.set(STORAGE_KEY, {
            files: [['seed-1', file]],
            status: UploadStatus.PROCESSING,
        })

        const core = new UpupCore({
            serverUrl: SERVER_URL,
            resumable: { protocol: 'multipart', thresholdBytes: 16 },
            crashRecovery: { storage },
        })

        await expect(core.restoreFromCrashRecovery()).resolves.toBe(true)
        expect(core.files.get('seed-1')?.status).toBe(UploadStatus.PAUSED)
        core.destroy()
    })

    it('stays silent when the session recorded no uploaded bytes — 0 B seeded is 0 B displayed anyway', async () => {
        vi.stubGlobal('localStorage', new MemoryStorage())
        const storage = makeInstantStorage()
        const file = makeSnapshotFile()
        storage.store.set(STORAGE_KEY, {
            files: [['seed-1', file]],
            status: UploadStatus.UPLOADING,
        })
        saveSession(fileFingerprint(file), {
            token: 'live-token',
            key: 'uploads/seed.mp4',
            partSize: 16,
            updatedAt: Date.now(),
            uploadedBytes: 0,
            scope: SERVER_URL,
        })

        const core = new UpupCore({
            serverUrl: SERVER_URL,
            crashRecovery: { storage },
        })
        const events: unknown[] = []
        core.on('upload-progress', (event: unknown) => {
            events.push(event)
        })

        await expect(core.restoreFromCrashRecovery()).resolves.toBe(true)
        expect(events).toEqual([])
        core.destroy()
    })
})

describe('crash-recovery autoResume', () => {
    /** A crashed multipart upload with a live session, ready to restore. */
    function seedCrashedUpload(storage: ReturnType<typeof makeInstantStorage>) {
        const file = Object.assign(
            new File([new Uint8Array(64)], 'seed.mp4', {
                type: 'video/mp4',
                lastModified: 1_700_000_000_000,
            }),
            {
                id: 'seed-1',
                source: FileSource.LOCAL,
                status: UploadStatus.UPLOADING,
                metadata: {},
            },
        )
        storage.store.set(STORAGE_KEY, {
            files: [['seed-1', file]],
            status: UploadStatus.UPLOADING,
        })
        saveSession(fileFingerprint(file), {
            token: 'live-token',
            key: 'uploads/seed.mp4',
            partSize: 16,
            updatedAt: Date.now(),
            uploadedBytes: 32,
            scope: SERVER_URL,
        })
    }

    it('autoResume: true continues the restored upload without a Resume click', async () => {
        vi.stubGlobal('localStorage', new MemoryStorage())
        // The auto-resumed run will genuinely hit the wire — park it so the
        // test observes the resume, not the (irrelevant) transfer outcome.
        vi.stubGlobal(
            'fetch',
            vi.fn(() => new Promise(() => {})),
        )
        const storage = makeInstantStorage()
        seedCrashedUpload(storage)

        const core = new UpupCore({
            serverUrl: SERVER_URL,
            resumable: {
                protocol: 'multipart',
                thresholdBytes: 16,
                autoResume: true,
            },
            crashRecovery: { storage },
        })
        const resumed = vi.fn()
        core.on('upload-resume', resumed)

        await expect(core.restoreFromCrashRecovery()).resolves.toBe(true)
        // Deferred a tick on purpose (host may still be mounting).
        expect(resumed).not.toHaveBeenCalled()
        await vi.waitFor(() => {
            expect(resumed).toHaveBeenCalledTimes(1)
        })
        expect(core.status).toBe(UploadStatus.UPLOADING)
        core.destroy()
    })

    it('without autoResume the restored upload stays PAUSED until the user acts — manual resume is the default contract', async () => {
        vi.stubGlobal('localStorage', new MemoryStorage())
        const storage = makeInstantStorage()
        seedCrashedUpload(storage)

        const core = new UpupCore({
            serverUrl: SERVER_URL,
            resumable: { protocol: 'multipart', thresholdBytes: 16 },
            crashRecovery: { storage },
        })
        const resumed = vi.fn()
        core.on('upload-resume', resumed)

        await expect(core.restoreFromCrashRecovery()).resolves.toBe(true)
        await new Promise(resolve => setTimeout(resolve, 10))
        expect(resumed).not.toHaveBeenCalled()
        expect(core.status).toBe(UploadStatus.PAUSED)
        core.destroy()
    })

    it('a destroy() racing the deferred auto-resume is a no-op, not a throw', async () => {
        vi.stubGlobal('localStorage', new MemoryStorage())
        const storage = makeInstantStorage()
        seedCrashedUpload(storage)

        const core = new UpupCore({
            serverUrl: SERVER_URL,
            resumable: {
                protocol: 'multipart',
                thresholdBytes: 16,
                autoResume: true,
            },
            crashRecovery: { storage },
        })

        await expect(core.restoreFromCrashRecovery()).resolves.toBe(true)
        core.destroy() // beats the 0-ms timer
        // resume() on a destroyed core throws; the guard must fire first.
        // An unhandled throw here would reject this tick — waiting one tick
        // with no rejection IS the assertion.
        await new Promise(resolve => setTimeout(resolve, 10))
    })
})
