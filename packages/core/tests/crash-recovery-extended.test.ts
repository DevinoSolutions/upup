import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CrashRecoveryManager, PersistentStorage } from '../src/crash-recovery'
import { UpupCore } from '../src/core'
import { FileSource, UploadStatus } from '@upup/core'

function makeStorage(): PersistentStorage & { store: Map<string, unknown> } {
    const store = new Map<string, unknown>()
    return {
        store,
        get: vi.fn(async (key: string) => store.get(key)),
        set: vi.fn(async (key: string, value: unknown) => { store.set(key, value) }),
        delete: vi.fn(async (key: string) => { store.delete(key) }),
    }
}

describe('CrashRecoveryManager — extended', () => {
    let storage: ReturnType<typeof makeStorage>
    let manager: CrashRecoveryManager

    beforeEach(() => {
        storage = makeStorage()
        manager = new CrashRecoveryManager(storage)
    })

    it('round-trips a complex snapshot faithfully', async () => {
        const snapshot = {
            files: [
                ['id-1', { id: 'id-1', name: 'photo.jpg', size: 2048 }],
                ['id-2', { id: 'id-2', name: 'doc.pdf', size: 99999 }],
            ],
            status: 'UPLOADING',
            progress: { loaded: 500, total: 2048 },
        }
        await manager.save(snapshot)
        const restored = await manager.restore()
        expect(restored).toEqual(snapshot)
    })

    it('save overwrites a previous snapshot', async () => {
        await manager.save({ version: 1 })
        await manager.save({ version: 2 })
        const restored = await manager.restore()
        expect(restored).toEqual({ version: 2 })
    })

    it('clear then restore returns null', async () => {
        await manager.save({ data: true })
        await manager.clear()
        const restored = await manager.restore()
        expect(restored).toBeNull()
    })

    it('save after clear stores the new snapshot', async () => {
        await manager.save({ first: true })
        await manager.clear()
        await manager.save({ second: true })
        const restored = await manager.restore()
        expect(restored).toEqual({ second: true })
    })

    it('multiple restore calls return the same data', async () => {
        await manager.save({ stable: true })
        const r1 = await manager.restore()
        const r2 = await manager.restore()
        expect(r1).toEqual(r2)
    })

    it('two managers sharing the same storage see the same data', async () => {
        const manager2 = new CrashRecoveryManager(storage)
        await manager.save({ shared: 'yes' })
        const restored = await manager2.restore()
        expect(restored).toEqual({ shared: 'yes' })
    })

    it('clear by one manager affects the other', async () => {
        const manager2 = new CrashRecoveryManager(storage)
        await manager.save({ data: 'exists' })
        await manager2.clear()
        expect(await manager.restore()).toBeNull()
    })

    it('handles undefined as snapshot value', async () => {
        await manager.save(undefined)
        // storage.set was called with undefined, restore returns undefined ?? null → null
        const restored = await manager.restore()
        expect(restored).toBeNull()
    })

    it('handles null as snapshot value', async () => {
        await manager.save(null)
        const restored = await manager.restore()
        expect(restored).toBeNull()
    })

    it('handles empty string as snapshot value', async () => {
        await manager.save('')
        const restored = await manager.restore()
        // '' is falsy, so storage.get returns '' which is not nullish → returned as-is
        expect(restored).toBe('')
    })
})

describe('UpupCore crash recovery integration', () => {
    const storageKey = 'upup-crash-recovery'

    it('restores active snapshots as paused so users can resume explicitly', async () => {
        const storage = makeStorage()
        const file = Object.assign(new File(['hello'], 'recover.txt', { type: 'text/plain' }), {
            id: 'recover-1',
            source: FileSource.LOCAL,
            status: UploadStatus.UPLOADING,
            metadata: {},
        })
        storage.store.set(storageKey, {
            files: [['recover-1', file]],
            status: UploadStatus.UPLOADING,
        })

        const core = new UpupCore({ crashRecovery: { storage } })
        await expect(core.restoreFromCrashRecovery()).resolves.toBe(true)

        expect(core.status).toBe(UploadStatus.PAUSED)
        expect(core.files.get('recover-1')?.status).toBe(UploadStatus.PAUSED)
        core.destroy()
    })

    it('stores UploadFile metadata outside the File object for IndexedDB-safe recovery', async () => {
        const storage = makeStorage()
        const core = new UpupCore({ crashRecovery: { storage } })
        await core.addFiles([new File(['hello'], 'serialized.txt', { type: 'text/plain' })])

        await vi.waitFor(() => {
            expect(storage.store.has(storageKey)).toBe(true)
        })

        const snapshot = storage.store.get(storageKey) as {
            files: [string, { file: File; id: string; name: string; type: string; source: FileSource; status: UploadStatus; metadata: Record<string, unknown> }][]
        }
        const [id, saved] = snapshot.files[0]
        expect(saved.file).toBeInstanceOf(File)
        expect(saved.file.name).toBe('serialized.txt')
        expect(saved.name).toBe('serialized.txt')
        expect(saved.type).toBe('text/plain')
        expect(saved.id).toBe(id)
        expect(saved.source).toBe(FileSource.LOCAL)
        expect(saved.status).toBe(UploadStatus.IDLE)
        core.destroy()
    })

    it('revives IndexedDB-cloned snapshots whose File object lost custom props', async () => {
        const storage = makeStorage()
        const uploadFile = Object.assign(new File(['hello'], 'cloned.txt', { type: 'text/plain' }), {
            id: 'recover-cloned',
            source: FileSource.LOCAL,
            status: UploadStatus.UPLOADING,
            metadata: { checksum: 'abc123' },
        })
        storage.store.set(storageKey, structuredClone({
            files: [[
                'recover-cloned',
                {
                    file: uploadFile,
                    id: uploadFile.id,
                    name: uploadFile.name,
                    type: uploadFile.type,
                    lastModified: uploadFile.lastModified,
                    source: uploadFile.source,
                    status: uploadFile.status,
                    metadata: uploadFile.metadata,
                },
            ]],
            status: UploadStatus.UPLOADING,
        }))

        const core = new UpupCore({ crashRecovery: { storage } })
        await expect(core.restoreFromCrashRecovery()).resolves.toBe(true)

        const restored = core.files.get('recover-cloned')
        expect(restored?.name).toBe('cloned.txt')
        expect(restored?.source).toBe(FileSource.LOCAL)
        expect(restored?.metadata.checksum).toBe('abc123')
        expect(restored?.status).toBe(UploadStatus.PAUSED)
        core.destroy()
    })

    it('does not clear saved recovery data on destroy', async () => {
        const storage = makeStorage()
        const core = new UpupCore({ crashRecovery: { storage } })
        await core.addFiles([new File(['hello'], 'persist.txt', { type: 'text/plain' })])

        await vi.waitFor(() => {
            expect(storage.store.has(storageKey)).toBe(true)
        })
        core.destroy()

        expect(storage.store.has(storageKey)).toBe(true)
    })

    it('clears saved recovery data when files are explicitly removed', async () => {
        const storage = makeStorage()
        const core = new UpupCore({ crashRecovery: { storage } })
        await core.addFiles([new File(['hello'], 'remove.txt', { type: 'text/plain' })])

        await vi.waitFor(() => {
            expect(storage.store.has(storageKey)).toBe(true)
        })
        core.removeAll()

        await vi.waitFor(() => {
            expect(storage.store.has(storageKey)).toBe(false)
        })
        core.destroy()
    })

    it('clears saved recovery data instead of persisting successful terminal state', async () => {
        const storage = makeStorage()
        const core = new UpupCore({ crashRecovery: { storage } })
        await core.addFiles([new File(['hello'], 'complete.txt', { type: 'text/plain' })])

        await vi.waitFor(() => {
            expect(storage.store.has(storageKey)).toBe(true)
        })

        const file = [...core.files.values()][0]
        Object.assign(file, { key: 'uploads/complete.txt', status: UploadStatus.SUCCESSFUL })
        core.restore({ files: [[file.id, file]], status: UploadStatus.SUCCESSFUL })

        await vi.waitFor(() => {
            expect(storage.store.has(storageKey)).toBe(false)
        })
        core.destroy()
    })
})
