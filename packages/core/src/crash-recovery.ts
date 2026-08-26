export interface PersistentStorage {
    get(key: string): Promise<unknown>
    set(key: string, value: unknown): Promise<void>
    delete(key: string): Promise<void>
}

const STORAGE_KEY = 'upup-crash-recovery'

export class CrashRecoveryManager {
    private storage: PersistentStorage

    constructor(storage: PersistentStorage) {
        this.storage = storage
    }

    async save(snapshot: unknown): Promise<void> {
        await this.storage.set(STORAGE_KEY, snapshot)
    }

    async restore(): Promise<unknown> {
        const data = await this.storage.get(STORAGE_KEY)
        return data ?? null
    }

    async clear(): Promise<void> {
        await this.storage.delete(STORAGE_KEY)
    }
}

/**
 * IndexedDB-based storage for browser environments.
 * Falls back gracefully when IndexedDB is unavailable (SSR, privacy mode).
 */
export class IndexedDBStorage implements PersistentStorage {
    private dbName: string
    private storeName = 'upup-store'
    /** ONE cached connection for the storage's lifetime — never closed after
     *  an operation. Firefox ties Blob/File handles read from IndexedDB to
     *  the connection they were read over: with the old open-per-operation /
     *  close-on-complete lifecycle, the File revived by the crash-recovery
     *  restore lost its backing store shortly after the restore's transaction
     *  closed, and mid-resume slice reads rejected with AbortError ("The
     *  operation was aborted") — a Firefox-only reload-resume stall reproduced
     *  against both MinIO and Backblaze B2 (Chromium materializes IndexedDB
     *  blobs independently of the connection and never failed). The cache
     *  still yields: `versionchange` (a deleteDatabase/upgrade elsewhere)
     *  closes and drops it so the other context is never blocked, and a
     *  browser-initiated `close` drops it so the next operation reopens. */
    private dbPromise: Promise<IDBDatabase> | null = null

    constructor(dbName = 'upup-crash-recovery') {
        this.dbName = dbName
    }

    private getDB(): Promise<IDBDatabase> {
        if (this.dbPromise) return this.dbPromise
        // The handlers below only clear `dbPromise` when it still points at
        // THIS open (identity check): a stale connection's late `close`/
        // `versionchange` must not wipe out a newer connection's cache.
        const promise = new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1)
            request.onupgradeneeded = () => {
                request.result.createObjectStore(this.storeName)
            }
            request.onsuccess = () => {
                const db = request.result
                db.onversionchange = () => {
                    db.close()
                    if (this.dbPromise === promise) {
                        this.dbPromise = null
                    }
                }
                db.onclose = () => {
                    if (this.dbPromise === promise) {
                        this.dbPromise = null
                    }
                }
                resolve(db)
            }
            request.onerror = () => {
                if (this.dbPromise === promise) {
                    this.dbPromise = null
                }
                reject(request.error ?? new Error('IndexedDB open failed'))
            }
        })
        this.dbPromise = promise
        return promise
    }

    /** Close and release the cached connection. Safe at any time — the next
     *  operation reopens. `UpupCore.destroy()` calls this so an unmounted
     *  uploader doesn't keep the database held open (pending transactions
     *  still drain first per the IndexedDB spec, so a queued snapshot write
     *  is never cut off mid-transaction). */
    close(): void {
        const promise = this.dbPromise
        if (!promise) return
        this.dbPromise = null
        void promise.then(
            db => {
                db.close()
            },
            () => {
                // upup-catch: the open already failed; nothing to close.
            },
        )
    }

    async get(key: string): Promise<unknown> {
        try {
            const db = await this.getDB()
            return await new Promise<unknown>((resolve, reject) => {
                const tx = db.transaction(this.storeName, 'readonly')
                const store = tx.objectStore(this.storeName)
                const request = store.get(key)
                request.onsuccess = () => {
                    resolve(request.result)
                }
                request.onerror = () => {
                    reject(request.error ?? new Error('IndexedDB get failed'))
                }
            })
        } catch {
            // upup-catch: crash recovery is best-effort — a missing or blocked
            // IndexedDB (SSR, privacy mode, quota) degrades to "no snapshot"
            // rather than surfacing as an error to the host app.
            return undefined
        }
    }

    async set(key: string, value: unknown): Promise<void> {
        try {
            const db = await this.getDB()
            await new Promise<void>((resolve, reject) => {
                const tx = db.transaction(this.storeName, 'readwrite')
                const store = tx.objectStore(this.storeName)
                const request = store.put(value, key)
                request.onsuccess = () => {
                    resolve()
                }
                request.onerror = () => {
                    reject(request.error ?? new Error('IndexedDB put failed'))
                }
            })
        } catch {
            // upup-catch: crash recovery is best-effort — persistence failures
            // (blocked/absent IndexedDB, quota) must not surface as upload errors;
            // silently degrade.
        }
    }

    async delete(key: string): Promise<void> {
        try {
            const db = await this.getDB()
            await new Promise<void>((resolve, reject) => {
                const tx = db.transaction(this.storeName, 'readwrite')
                const store = tx.objectStore(this.storeName)
                const request = store.delete(key)
                request.onsuccess = () => {
                    resolve()
                }
                request.onerror = () => {
                    reject(
                        request.error ?? new Error('IndexedDB delete failed'),
                    )
                }
            })
        } catch {
            // upup-catch: crash recovery is best-effort — a failed delete (blocked/
            // absent IndexedDB) must not surface as an upload error; silently degrade.
        }
    }
}
