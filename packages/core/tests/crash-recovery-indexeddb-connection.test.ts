// Contract: IndexedDBStorage holds ONE cached connection for its lifetime —
// it must never close the database after an operation.
//
// Firefox ties Blob/File handles read from IndexedDB to the connection they
// were read over. The crash-recovery restore hands the strategy a File revived
// from the snapshot; with the old open-per-operation/close-on-complete
// lifecycle, Firefox invalidated that File's backing store shortly after the
// restore's transaction closed, and mid-resume slice reads started rejecting
// with AbortError ("The operation was aborted") — reproduced live as a
// Firefox-only reload-resume stall against both MinIO and Backblaze B2, while
// Chromium (which materializes IndexedDB blobs independently of the
// connection) never failed. Keeping the connection open keeps the revived
// File readable for the whole resume.
//
// The cache must still yield: a `versionchange` (someone calling
// deleteDatabase / upgrading in another tab) closes and drops it so the other
// context is never blocked forever, and a browser-initiated `close` drops it
// so the next operation reopens instead of erroring on a dead handle.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { IndexedDBStorage } from '../src/crash-recovery'

type Listener = (() => void) | null

class FakeRequest<T = unknown> {
    onsuccess: Listener = null
    onerror: Listener = null
    result: T | undefined
    error: Error | null = null

    succeed(result: T | undefined): void {
        this.result = result
        queueMicrotask(() => this.onsuccess?.())
    }
}

interface FakeTx {
    objectStore: (name: string) => FakeObjectStore
    oncomplete: Listener
    onerror: Listener
}

class FakeObjectStore {
    constructor(
        private data: Map<string, unknown>,
        private tx: FakeTx,
    ) {}

    /** Fires the request's success, then the transaction's completion — the
     *  real IDB ordering, and the moment the old lifecycle closed the db. */
    private finish<T>(req: FakeRequest<T>, result: T | undefined): void {
        req.succeed(result)
        queueMicrotask(() => queueMicrotask(() => this.tx.oncomplete?.()))
    }

    get(key: string): FakeRequest {
        const req = new FakeRequest()
        this.finish(req, this.data.get(key))
        return req
    }

    put(value: unknown, key: string): FakeRequest {
        const req = new FakeRequest()
        this.data.set(key, value)
        this.finish(req, undefined)
        return req
    }

    delete(key: string): FakeRequest {
        const req = new FakeRequest()
        this.data.delete(key)
        this.finish(req, undefined)
        return req
    }
}

class FakeDB {
    onversionchange: Listener = null
    onclose: Listener = null
    readonly close = vi.fn()

    constructor(private data: Map<string, unknown>) {}

    createObjectStore(_name: string): void {}

    transaction(_store: string, _mode: string): FakeTx {
        const tx: FakeTx = {
            objectStore: () => new FakeObjectStore(this.data, tx),
            oncomplete: null,
            onerror: null,
        }
        return tx
    }
}

function installFakeIndexedDB(): {
    openCalls: () => number
    lastDB: () => FakeDB
} {
    const data = new Map<string, unknown>()
    const dbs: FakeDB[] = []
    const open = vi.fn((_name: string, _version: number) => {
        const req = new FakeRequest<FakeDB>() as FakeRequest<FakeDB> & {
            onupgradeneeded: Listener
        }
        req.onupgradeneeded = null
        const db = new FakeDB(data)
        dbs.push(db)
        req.succeed(db)
        return req
    })
    vi.stubGlobal('indexedDB', { open })
    return {
        openCalls: () => open.mock.calls.length,
        lastDB: () => {
            const db = dbs[dbs.length - 1]
            if (!db) throw new Error('no FakeDB opened yet')
            return db
        },
    }
}

let fake: ReturnType<typeof installFakeIndexedDB>

beforeEach(() => {
    fake = installFakeIndexedDB()
})

afterEach(() => {
    vi.unstubAllGlobals()
})

describe('IndexedDBStorage connection lifecycle (Firefox revived-Blob contract)', () => {
    it('reuses one cached connection across operations instead of opening per call', async () => {
        const storage = new IndexedDBStorage()
        await storage.set('k', { a: 1 })
        await storage.get('k')
        await storage.delete('k')
        expect(fake.openCalls()).toBe(1)
    })

    it('never closes the connection after an operation — a revived File must stay readable for the whole resume', async () => {
        const storage = new IndexedDBStorage()
        await storage.set('k', { a: 1 })
        expect(await storage.get('k')).toEqual({ a: 1 })
        // The old lifecycle closed in tx.oncomplete, which fires AFTER the
        // request settles — flush a macrotask so that moment has passed.
        await new Promise(resolve => setTimeout(resolve, 0))
        expect(fake.lastDB().close).not.toHaveBeenCalled()
    })

    it('versionchange closes and drops the cache so a deleteDatabase elsewhere is never blocked, and the next op reopens', async () => {
        const storage = new IndexedDBStorage()
        await storage.set('k', { a: 1 })
        const first = fake.lastDB()

        // Pre-assertions pinning the NEW lifecycle: without them this test
        // also passes on the old open-per-operation code (which would have
        // already closed in tx.oncomplete and would reopen anyway).
        await new Promise(resolve => setTimeout(resolve, 0))
        expect(first.close).not.toHaveBeenCalled()
        expect(fake.openCalls()).toBe(1)

        first.onversionchange?.()
        expect(first.close).toHaveBeenCalledTimes(1)

        await storage.get('k')
        expect(fake.openCalls()).toBe(2)
    })

    it('a browser-initiated close drops the cache and the next operation reopens instead of using a dead handle', async () => {
        const storage = new IndexedDBStorage()
        await storage.set('k', { a: 1 })
        const first = fake.lastDB()

        // Same pre-assertions as above: pin that the cache was still live
        // (old code would have closed and reopened regardless).
        await new Promise(resolve => setTimeout(resolve, 0))
        expect(first.close).not.toHaveBeenCalled()
        expect(fake.openCalls()).toBe(1)

        first.onclose?.()

        expect(await storage.get('k')).toEqual({ a: 1 })
        expect(fake.openCalls()).toBe(2)
    })

    it('close() releases the cached connection and the next operation reopens cleanly', async () => {
        const storage = new IndexedDBStorage()
        await storage.set('k', { a: 1 })
        const first = fake.lastDB()

        storage.close()
        // close() resolves the cached promise before closing — flush it.
        await new Promise(resolve => setTimeout(resolve, 0))
        expect(first.close).toHaveBeenCalledTimes(1)

        expect(await storage.get('k')).toEqual({ a: 1 })
        expect(fake.openCalls()).toBe(2)
    })

    it("a stale connection's late close event does not wipe a newer cached connection", async () => {
        const storage = new IndexedDBStorage()
        await storage.set('k', { a: 1 })
        const first = fake.lastDB()

        // Browser closes the first connection; next op opens a second one.
        first.onclose?.()
        await storage.get('k')
        expect(fake.openCalls()).toBe(2)

        // A duplicate/late close from the FIRST connection must be ignored:
        // the second connection stays cached, so no third open happens.
        first.onclose?.()
        await storage.get('k')
        expect(fake.openCalls()).toBe(2)
    })
})
