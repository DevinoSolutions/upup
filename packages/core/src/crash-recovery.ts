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

  async restore(): Promise<unknown | null> {
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
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async get(key: string): Promise<unknown> {
    try {
      const db = await this.getDB()
      return new Promise((resolve, reject) => {
        const tx = db.transaction(this.storeName, 'readonly')
        const store = tx.objectStore(this.storeName)
        const request = store.get(key)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
    } catch {
      return undefined
    }
  }

  async set(key: string, value: unknown): Promise<void> {
    try {
      const db = await this.getDB()
      return new Promise((resolve, reject) => {
        const tx = db.transaction(this.storeName, 'readwrite')
        const store = tx.objectStore(this.storeName)
        const request = store.put(value, key)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch {
      // Silently fail — crash recovery is best-effort
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const db = await this.getDB()
      return new Promise((resolve, reject) => {
        const tx = db.transaction(this.storeName, 'readwrite')
        const store = tx.objectStore(this.storeName)
        const request = store.delete(key)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch {
      // Silently fail
    }
  }
}
