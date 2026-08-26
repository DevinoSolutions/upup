// Contract: with cross-reload resume active, an interrupted multipart upload
// deliberately keeps its server-side parts alive so a later attempt can finish
// them. That makes explicit discard the ONE place that must say "no, really,
// drop it" — cancel(), removeFile() and removeAll() abort the upload and clear
// its persisted session, or the user keeps paying storage for parts nothing
// will ever complete.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { UpupCore } from '../src/core'
import {
    fileFingerprint,
    loadSession,
    saveSession,
} from '../src/utils/multipart-session-store'
import { FileSource } from '../src/types/file-source'
import { UploadStatus } from '../src/types/upload-status'
import type { CoreOptions } from '../src/core'
import type { UploadFile } from '../src/types/upload-file'

// Minimal in-memory Storage stand-in — test infrastructure bridging the Web
// Storage API the session store expects onto vitest's `node` environment.
class MemoryStorage {
    private store = new Map<string, string>()

    getItem(key: string): string | null {
        return this.store.has(key) ? (this.store.get(key) as string) : null
    }
    setItem(key: string, value: string): void {
        this.store.set(key, value)
    }
    removeItem(key: string): void {
        this.store.delete(key)
    }
    clear(): void {
        this.store.clear()
    }
    key(index: number): string | null {
        return Array.from(this.store.keys())[index] ?? null
    }
    get length(): number {
        return this.store.size
    }
}

const SERVER_URL = 'https://api.example.com/upup'
const mockFetch = vi.fn()

function makeFile(name = 'movie.mp4'): File {
    return new File([new Uint8Array(64)], name, {
        type: 'video/mp4',
        lastModified: 1_700_000_000_000,
    })
}

function seedSession(file: File, token = 'live-token'): string {
    const fingerprint = fileFingerprint(file)
    saveSession(fingerprint, {
        token,
        key: `uploads/${file.name}`,
        partSize: 5 * 1024 * 1024,
        updatedAt: Date.now(),
        uploadedBytes: 0,
        scope: SERVER_URL,
    })
    return fingerprint
}

function makeCore(overrides: Partial<CoreOptions> = {}): UpupCore {
    return new UpupCore({
        serverUrl: SERVER_URL,
        resumable: { protocol: 'multipart' },
        ...overrides,
    } as CoreOptions)
}

/** The URLs the abort route was actually asked for. */
function abortCalls(): string[] {
    return mockFetch.mock.calls
        .map(call => String(call[0]))
        .filter(url => url.endsWith('/multipart/abort'))
}

describe('UpupCore — discarding persisted multipart sessions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.stubGlobal('localStorage', new MemoryStorage())
        mockFetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ ok: true }),
        })
        vi.stubGlobal('fetch', mockFetch)
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('aborts and clears the session of every pending file on cancel()', async () => {
        const file = makeFile()
        const fingerprint = seedSession(file)
        const core = makeCore()
        await core.addFiles([file])

        core.cancel()

        expect(loadSession(fingerprint)).toBeNull()
        expect(abortCalls()).toHaveLength(1)
        expect(String(mockFetch.mock.calls[0]?.[1]?.body)).toContain(
            'live-token',
        )
    })

    it('aborts and clears the session of the one file removeFile() drops', async () => {
        const kept = makeFile('kept.mp4')
        const dropped = makeFile('dropped.mp4')
        const keptFingerprint = seedSession(kept, 'kept-token')
        const droppedFingerprint = seedSession(dropped, 'dropped-token')
        const core = makeCore()
        await core.addFiles([kept, dropped])
        const droppedId = [...core.files.values()].find(
            f => f.name === 'dropped.mp4',
        )!.id

        core.removeFile(droppedId)

        expect(loadSession(droppedFingerprint)).toBeNull()
        expect(loadSession(keptFingerprint)?.token).toBe('kept-token')
        expect(abortCalls()).toHaveLength(1)
    })

    it('aborts and clears every session on removeAll()', async () => {
        const a = makeFile('a.mp4')
        const b = makeFile('b.mp4')
        const fpA = seedSession(a, 'token-a')
        const fpB = seedSession(b, 'token-b')
        const core = makeCore()
        await core.addFiles([a, b])

        core.removeAll()

        expect(loadSession(fpA)).toBeNull()
        expect(loadSession(fpB)).toBeNull()
        expect(abortCalls()).toHaveLength(2)
    })

    it('leaves sessions alone when the integrator opted out of persistence', async () => {
        const file = makeFile()
        const fingerprint = seedSession(file)
        const core = makeCore({
            resumable: { protocol: 'multipart', persist: false },
        })
        await core.addFiles([file])

        core.cancel()

        // persist:false already aborts inside the strategy on failure — the
        // core-level sweep must not fire a second time.
        expect(abortCalls()).toHaveLength(0)
        expect(loadSession(fingerprint)?.token).toBe('live-token')
    })

    it('does nothing for a non-multipart upload target', async () => {
        const file = makeFile()
        const fingerprint = seedSession(file)
        const core = makeCore({ resumable: undefined })
        await core.addFiles([file])

        core.cancel()

        expect(abortCalls()).toHaveLength(0)
        expect(loadSession(fingerprint)?.token).toBe('live-token')
    })

    it('skips files that already finished uploading — their parts are long gone', () => {
        const file = makeFile()
        const fingerprint = seedSession(file)
        const finished = Object.assign(file, {
            id: 'done',
            source: FileSource.LOCAL,
            status: UploadStatus.SUCCESSFUL,
            metadata: {},
            key: 'uploads/movie.mp4',
        }) as UploadFile
        const core = makeCore()
        core.restore({
            files: [['done', finished]],
            status: UploadStatus.SUCCESSFUL,
        })

        core.cancel()

        expect(abortCalls()).toHaveLength(0)
        expect(loadSession(fingerprint)?.token).toBe('live-token')
    })
})
