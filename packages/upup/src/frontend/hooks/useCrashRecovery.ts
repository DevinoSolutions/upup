import { useCallback, useRef, useState } from 'react'
import type { CrashRecoveryOptions, FileWithParams } from '../../shared/types'
import {
    clearAll,
    clearFiles,
    type PersistedFileMeta,
    retrieveFiles,
    storeFile,
} from '../lib/crashRecovery/indexedDBStore'

const DEFAULT_STORE_NAME = 'upup_crash_recovery'
const DEFAULT_EXPIRY = 86_400_000 // 24 hours

type ResolvedOptions = {
    enabled: boolean
    storeName: string
    expiry: number
}

function resolveOptions(
    raw: boolean | CrashRecoveryOptions | undefined,
): ResolvedOptions {
    if (raw === false || raw === undefined)
        return {
            enabled: false,
            storeName: DEFAULT_STORE_NAME,
            expiry: DEFAULT_EXPIRY,
        }
    if (raw === true)
        return {
            enabled: true,
            storeName: DEFAULT_STORE_NAME,
            expiry: DEFAULT_EXPIRY,
        }
    return {
        enabled: raw.enabled !== false,
        storeName: raw.storeName ?? DEFAULT_STORE_NAME,
        expiry: raw.expiry ?? DEFAULT_EXPIRY,
    }
}

/**
 * Reconstructs a File + blob URL from persisted data.
 * After a page refresh the old blob URLs are invalid, so we create new ones.
 */
function reconstruct(
    meta: PersistedFileMeta,
    blob: Blob,
    thumbnailBlob?: Blob,
): FileWithParams {
    const file = new File([blob], meta.name, {
        type: meta.type,
        lastModified: meta.lastModified,
    }) as FileWithParams

    file.id = meta.id
    file.url = URL.createObjectURL(file)
    if (meta.relativePath) file.relativePath = meta.relativePath
    if (meta.key) file.key = meta.key
    if (meta.fileHash) file.fileHash = meta.fileHash

    if (meta.thumbnail && thumbnailBlob) {
        const thumbFile = new File([thumbnailBlob], meta.thumbnail.name, {
            type: meta.thumbnail.type,
            lastModified: meta.thumbnail.lastModified,
        })
        file.thumbnail = {
            file: thumbFile,
            key: meta.thumbnail.key,
        }
    }

    return file
}

export function useCrashRecovery(
    raw: boolean | CrashRecoveryOptions | undefined,
) {
    const opts = resolveOptions(raw)
    const optsRef = useRef(opts)
    optsRef.current = opts

    const [isRestoring, setIsRestoring] = useState(false)

    /** Persist the current file map to IndexedDB. */
    const persistFiles = useCallback(
        async (filesMap: Map<string, FileWithParams>) => {
            const { enabled, storeName } = optsRef.current
            if (!enabled) return

            // We do a full replace: clear then write all files.
            // This keeps the store in sync with the in-memory state.
            await clearAll(storeName)

            const entries = Array.from(filesMap.values())
            for (const fp of entries) {
                const meta: PersistedFileMeta = {
                    id: fp.id,
                    name: fp.name,
                    type: fp.type,
                    size: fp.size,
                    lastModified: fp.lastModified,
                    relativePath: fp.relativePath,
                    storedAt: Date.now(),
                    key: fp.key,
                    fileHash: fp.fileHash,
                    thumbnail: fp.thumbnail
                        ? {
                              name: fp.thumbnail.file.name,
                              type: fp.thumbnail.file.type,
                              size: fp.thumbnail.file.size,
                              lastModified: fp.thumbnail.file.lastModified,
                              key: fp.thumbnail.key,
                          }
                        : undefined,
                }
                await storeFile(storeName, meta, fp, fp.thumbnail?.file)
            }
        },
        [],
    )

    /** Restore persisted files from IndexedDB. Returns a Map ready to use as selectedFilesMap. */
    const restoreFiles = useCallback(async (): Promise<Map<
        string,
        FileWithParams
    > | null> => {
        const { enabled, storeName, expiry } = optsRef.current
        if (!enabled) return null

        setIsRestoring(true)
        try {
            const records = await retrieveFiles(storeName, expiry)
            if (!records.length) return null

            const map = new Map<string, FileWithParams>()
            for (const rec of records) {
                const file = reconstruct(rec.meta, rec.blob, rec.thumbnailBlob)
                map.set(file.id, file)
            }
            return map
        } catch {
            // If IndexedDB is unavailable or corrupt, fail gracefully
            return null
        } finally {
            setIsRestoring(false)
        }
    }, [])

    /** Remove specific file IDs from the persisted store. */
    const removePersistedFiles = useCallback(async (ids: string[]) => {
        const { enabled, storeName } = optsRef.current
        if (!enabled) return
        await clearFiles(storeName, ids)
    }, [])

    /** Clear all persisted crash recovery data. */
    const clearPersistedFiles = useCallback(async () => {
        const { enabled, storeName } = optsRef.current
        if (!enabled) return
        await clearAll(storeName)
    }, [])

    return {
        isRestoring,
        persistFiles,
        restoreFiles,
        removePersistedFiles,
        clearPersistedFiles,
        enabled: opts.enabled,
    } as const
}
