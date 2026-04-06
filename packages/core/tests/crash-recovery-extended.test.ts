import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CrashRecoveryManager, PersistentStorage } from '../src/crash-recovery'

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
