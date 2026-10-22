// Contract: the crash-recovery snapshot must never outlive the files it
// describes. A user who discards the last restored file must not see it come
// back on the next reload — the snapshot write paths deliberately skip an
// empty file set (nothing to save), so every path that EMPTIES the set has to
// clear the snapshot itself, exactly as removeAll() does.

import { describe, it, expect, vi } from 'vitest'
import { UpupCore } from '../src/core'
import { FileSource, UploadStatus } from '@useupup/core'

const STORAGE_KEY = 'upup-crash-recovery'

function makeInstantStorage() {
    const store = new Map<string, unknown>()
    return {
        store,
        get: async (key: string) => store.get(key),
        set: async (key: string, value: unknown) => {
            store.set(key, value)
        },
        delete: async (key: string) => {
            store.delete(key)
        },
    }
}

function makeSnapshotFile(index: number) {
    return Object.assign(
        new File([new Uint8Array(64)], `crashed-${index}.bin`, {
            type: 'application/octet-stream',
            lastModified: 1_700_000_000_000 + index,
        }),
        {
            id: `crashed-${index}`,
            source: FileSource.LOCAL,
            status: UploadStatus.PAUSED,
            metadata: {},
        },
    )
}

async function restoredCore(fileCount: number) {
    const storage = makeInstantStorage()
    const files = Array.from({ length: fileCount }, (_, i) =>
        makeSnapshotFile(i),
    )
    storage.store.set(STORAGE_KEY, {
        files: files.map(file => [file.id, file]),
        status: UploadStatus.PAUSED,
    })
    const core = new UpupCore({ crashRecovery: { storage } })
    await expect(core.restoreFromCrashRecovery()).resolves.toBe(true)
    return { core, storage, files }
}

async function snapshotFileIds(storage: ReturnType<typeof makeInstantStorage>) {
    const snapshot = storage.store.get(STORAGE_KEY) as
        { files: Array<[string, unknown]> } | undefined
    return snapshot?.files.map(([id]) => id)
}

describe('crash-recovery snapshot when the file set empties', () => {
    it('removing the last restored file per-file clears the snapshot, so the next load restores nothing', async () => {
        const { core, storage } = await restoredCore(1)

        core.removeFile('crashed-0')

        await expect.poll(() => storage.store.has(STORAGE_KEY)).toBe(false)
        const nextLoad = new UpupCore({ crashRecovery: { storage } })
        await expect(nextLoad.restoreFromCrashRecovery()).resolves.toBe(false)
        core.destroy()
        nextLoad.destroy()
    })

    it('removing one of several restored files re-syncs the snapshot to the survivors', async () => {
        const { core, storage } = await restoredCore(2)

        core.removeFile('crashed-0')

        await expect.poll(() => snapshotFileIds(storage)).toEqual(['crashed-1'])
        core.destroy()
    })

    it('setFiles([]) clears the snapshot like removeAll does', async () => {
        const { core, storage } = await restoredCore(1)

        await core.setFiles([])

        await expect.poll(() => storage.store.has(STORAGE_KEY)).toBe(false)
        core.destroy()
    })

    it('reordering restored files keeps the snapshot with the same files', async () => {
        const { core, storage } = await restoredCore(2)

        core.reorderFiles(['crashed-1', 'crashed-0'])

        await expect
            .poll(() => snapshotFileIds(storage))
            .toEqual(['crashed-1', 'crashed-0'])
        core.destroy()
    })
})

// The clear is queued behind in-flight writes, and later state changes coalesce
// into a snapshot sync queued BEFORE it. A clear decided on "the set is empty"
// at call time must therefore re-check at execution time, or it wipes the
// snapshot of files added after the removal.
describe('crash-recovery clear queued behind a slow save', () => {
    it.each([
        ['addFiles', (core: UpupCore, f: File) => core.addFiles([f])],
        ['setFiles', (core: UpupCore, f: File) => core.setFiles([f])],
    ])(
        'does not wipe a snapshot of files added via %s after the last one was removed',
        async (_name, add) => {
            const store = new Map<string, unknown>()
            const pendingSaves: Array<() => void> = []
            const storage = {
                get: async (key: string) => store.get(key),
                set: (key: string, value: unknown) =>
                    new Promise<void>(resolve => {
                        pendingSaves.push(() => {
                            store.set(key, value)
                            resolve()
                        })
                    }),
                delete: async (key: string) => {
                    store.delete(key)
                },
            }
            const core = new UpupCore({ crashRecovery: { storage } })
            await core.addFiles([
                new File(['a'], 'a.txt', { type: 'text/plain' }),
                new File(['b'], 'b.txt', { type: 'text/plain' }),
            ])
            // S1 is parked mid-write; the reorder queues the coalesced S2 behind it.
            await vi.waitFor(() => expect(pendingSaves.length).toBe(1))
            const ids = [...core.files.keys()]
            core.reorderFiles([...ids].reverse())

            // Empty the set (queues the clear C behind S2), then add a new file.
            for (const id of ids) core.removeFile(id)
            expect(core.files.size).toBe(0)
            await add(core, new File(['c'], 'new.txt', { type: 'text/plain' }))

            // Drain: S1, then S2 (which reads the new file at write time), then C.
            await vi.waitFor(() => {
                pendingSaves.shift()?.()
                const snapshot = store.get(STORAGE_KEY) as
                    { files: Array<[string, { name: string }]> } | undefined
                expect(snapshot?.files.map(([, f]) => f.name)).toEqual([
                    'new.txt',
                ])
            })
            // The write queue is promise-only, so draining microtasks lets the
            // queued clear run; it must not have removed the snapshot.
            for (let i = 0; i < 50; i++) await Promise.resolve()
            const snapshot = store.get(STORAGE_KEY) as
                { files: Array<[string, { name: string }]> } | undefined
            expect(snapshot?.files.map(([, f]) => f.name)).toEqual(['new.txt'])
            core.destroy()
        },
    )
})
