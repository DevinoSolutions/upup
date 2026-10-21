// Contract: the crash-recovery snapshot must never outlive the files it
// describes. A user who discards the last restored file must not see it come
// back on the next reload — the snapshot write paths deliberately skip an
// empty file set (nothing to save), so every path that EMPTIES the set has to
// clear the snapshot itself, exactly as removeAll() does.

import { describe, it, expect } from 'vitest'
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
