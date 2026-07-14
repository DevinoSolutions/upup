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

    constructor(dbName = 'upup-crash-recovery') {
        this.dbName = dbName
    }

    private async getDB(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1)
            request.onupgradeneeded = () => {
                request.result.createObjectStore(this.storeName)
            }
            request.onsuccess = () => {
                resolve(request.result)
            }
            request.onerror = () => {
                reject(request.error ?? new Error('IndexedDB open failed'))
            }
        })
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
                tx.oncomplete = () => {
                    db.close()
                }
                tx.onerror = () => {
                    db.close()
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
                tx.oncomplete = () => {
                    db.close()
                }
                tx.onerror = () => {
                    db.close()
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
                tx.oncomplete = () => {
                    db.close()
                }
                tx.onerror = () => {
                    db.close()
                }
            })
        } catch {
            // upup-catch: crash recovery is best-effort — a failed delete (blocked/
            // absent IndexedDB) must not surface as an upload error; silently degrade.
        }
    }
}
