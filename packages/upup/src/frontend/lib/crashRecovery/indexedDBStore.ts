/**
 * IndexedDB-based file store for crash recovery.
 *
 * Persists file metadata + blobs so that the file selection can be restored
 * after a page refresh or browser crash. Each record includes a timestamp
 * that is compared against the configured `expiry` on restore.
 */

const STORE_NAME = 'files'
const DB_VERSION = 1

/** Serialisable metadata stored alongside each file blob. */
export type PersistedFileMeta = {
    id: string
    name: string
    type: string
    size: number
    lastModified: number
    relativePath?: string
    /** Timestamp (ms) when this record was persisted. */
    storedAt: number
    /** Optional key assigned after a partial upload. */
    key?: string
    /** Optional file hash. */
    fileHash?: string
    /** Thumbnail metadata (blob stored separately under `id + ':thumb'`). */
    thumbnail?: {
        name: string
        type: string
        size: number
        lastModified: number
        key?: string
    }
}

/** A combined record: metadata + main blob + optional thumbnail blob. */
export type PersistedFileRecord = {
    meta: PersistedFileMeta
    blob: Blob
    thumbnailBlob?: Blob
}

function openDB(dbName: string): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, DB_VERSION)

        request.onupgradeneeded = () => {
            const db = request.result
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME)
            }
        }

        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
    })
}

/** Store a single file (blob + metadata) into IndexedDB. */
export async function storeFile(
    dbName: string,
    meta: PersistedFileMeta,
    blob: Blob,
    thumbnailBlob?: Blob,
): Promise<void> {
    const db = await openDB(dbName)
    try {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        store.put(blob, meta.id)
        store.put(meta, meta.id + ':meta')
        if (thumbnailBlob && meta.thumbnail) {
            store.put(thumbnailBlob, meta.id + ':thumb')
        }
        await txComplete(tx)
    } finally {
        db.close()
    }
}

/** Retrieve all non-expired persisted files from IndexedDB. */
export async function retrieveFiles(
    dbName: string,
    expiry: number,
): Promise<PersistedFileRecord[]> {
    const db = await openDB(dbName)
    try {
        const tx = db.transaction(STORE_NAME, 'readonly')
        const store = tx.objectStore(STORE_NAME)
        const allKeys = await idbRequest<IDBValidKey[]>(store.getAllKeys())
        const now = Date.now()

        // Collect meta keys
        const metaKeys = allKeys.filter(
            k => typeof k === 'string' && k.endsWith(':meta'),
        ) as string[]

        const records: PersistedFileRecord[] = []
        const expiredIds: string[] = []

        for (const metaKey of metaKeys) {
            const meta = await idbRequest<PersistedFileMeta>(store.get(metaKey))
            if (!meta) continue

            if (now - meta.storedAt > expiry) {
                expiredIds.push(meta.id)
                continue
            }

            const blob = await idbRequest<Blob>(store.get(meta.id))
            if (!blob) continue

            let thumbnailBlob: Blob | undefined
            if (meta.thumbnail) {
                thumbnailBlob = await idbRequest<Blob>(
                    store.get(meta.id + ':thumb'),
                )
            }

            records.push({ meta, blob, thumbnailBlob })
        }

        await txComplete(tx)

        // Clean up expired entries in a separate transaction
        if (expiredIds.length) {
            void clearFiles(dbName, expiredIds)
        }

        return records
    } finally {
        db.close()
    }
}

/** Delete specific files from IndexedDB by their IDs. */
export async function clearFiles(dbName: string, ids: string[]): Promise<void> {
    const db = await openDB(dbName)
    try {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        for (const id of ids) {
            store.delete(id)
            store.delete(id + ':meta')
            store.delete(id + ':thumb')
        }
        await txComplete(tx)
    } finally {
        db.close()
    }
}

/** Wipe the entire object store. */
export async function clearAll(dbName: string): Promise<void> {
    const db = await openDB(dbName)
    try {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        tx.objectStore(STORE_NAME).clear()
        await txComplete(tx)
    } finally {
        db.close()
    }
}

// ── Helpers ──────────────────────────────────────────────────────────

function idbRequest<T>(req: IDBRequest): Promise<T> {
    return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result as T)
        req.onerror = () => reject(req.error)
    })
}

function txComplete(tx: IDBTransaction): Promise<void> {
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
    })
}
