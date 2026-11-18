// Contract: a run that finishes through resume() reports its completion the
// same way a run that finishes through upload() or retry() does.
//
// Reproduced against v3.3.5 in server mode with multipart: the network drops
// mid-upload, the offline handler pauses the run, `online` resumes it, the
// remaining parts are sent and `multipart/complete` answers 200 — and then
// nothing. resume() set SUCCESSFUL and emitted only `state-change`, so
// `upload-all-complete` never fired, `onFilesUploadComplete` never ran, and
// the host app never learned the file's key. The bytes were stored and the
// upload was lost.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { UpupCore } from '../src/core'
import { UploadStatus } from '@useupup/core'
import type { UploadFile } from '@useupup/core'
import {
    installXhrPartMock,
    type PartRequest,
    type PartResponse,
} from './strategies/xhr-part-mock'

// Minimal in-memory Storage stand-in — test infrastructure bridging the Web
// Storage API the multipart session store expects onto vitest's `node`
// environment, not a mock of the code under test. Mirrors the shim in
// tests/strategies/multipart-upload-cross-reload-resume.test.ts.
class MemoryStorage {
    private store = new Map<string, string>()

    getItem(key: string): string | null {
        return this.store.get(key) ?? null
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

/** Minimal window stand-in: just enough EventTarget for core's
 *  `networkAware` listeners. */
function makeWindowStub() {
    const listeners = new Map<string, Set<() => void>>()
    return {
        addEventListener: (type: string, fn: () => void) => {
            if (!listeners.has(type)) listeners.set(type, new Set())
            listeners.get(type)?.add(fn)
        },
        removeEventListener: (type: string, fn: () => void) => {
            listeners.get(type)?.delete(fn)
        },
        fire(type: 'online' | 'offline') {
            for (const fn of listeners.get(type) ?? []) fn()
        },
    }
}

const PART = 1024
const SERVER_URL = 'https://api.example.com/upup'
const KEY = 'uploads/clip.mp4'

function jsonResponse(body: unknown): Response {
    return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    })
}

/** The `@useupup/server` multipart routes, answered in memory. `routes` records
 *  the order they were called in. */
function stubServer(storedParts: () => number[]) {
    const routes: string[] = []
    vi.stubGlobal(
        'fetch',
        vi.fn(async (url: string, init?: RequestInit) => {
            const route = url.replace(SERVER_URL, '')
            routes.push(route)
            const body = JSON.parse(String(init?.body)) as {
                partNumber?: number
            }
            if (route === '/multipart/init') {
                return jsonResponse({
                    key: KEY,
                    uploadId: 'upload-1',
                    partSize: PART,
                    expiresIn: 3600,
                    token: 'init-token',
                })
            }
            if (route === '/multipart/sign-part') {
                return jsonResponse({
                    uploadUrl: `https://s3/part${body.partNumber}?signed`,
                    expiresIn: 3600,
                })
            }
            if (route === '/multipart/resume') {
                return jsonResponse({
                    key: KEY,
                    token: 'resumed-token',
                    parts: storedParts().map(partNumber => ({
                        partNumber,
                        eTag: `"etag-${partNumber}"`,
                        size: PART,
                    })),
                })
            }
            if (route === '/multipart/complete') {
                return jsonResponse({ key: KEY, etag: '"final"' })
            }
            throw new Error(`unexpected route ${route}`)
        }),
    )
    return routes
}

const { puts, install } = installXhrPartMock()

beforeEach(() => {
    install()
    puts.mockReset()
    vi.stubGlobal('localStorage', new MemoryStorage())
})

afterEach(() => {
    vi.unstubAllGlobals()
})

describe('a run finished by resume() reports completion', () => {
    it('emits upload-all-complete once with the keyed file after an offline drop auto-resumes a multipart upload', async () => {
        const win = makeWindowStub()
        vi.stubGlobal('window', win)

        // Part 1 lands; part 2 is in flight when the network drops, so its
        // PUT never settles and only the pause's abort ends it.
        const stored: number[] = []
        let online = true
        let dropped = false
        puts.mockImplementation((req: PartRequest) => {
            const partNumber = Number(/part(\d+)/.exec(req.url)?.[1])
            if (!online) return new Promise<PartResponse>(() => {})
            if (partNumber === 2 && !dropped) {
                dropped = true
                online = false
                win.fire('offline')
                return new Promise<PartResponse>(() => {})
            }
            stored.push(partNumber)
            return Promise.resolve({
                status: 200,
                headers: { ETag: `"etag-${partNumber}"` },
            })
        })
        const routes = stubServer(() => stored.slice())

        const core = new UpupCore({
            provider: 'aws',
            serverUrl: SERVER_URL,
            maxRetries: 0,
            resumable: {
                protocol: 'multipart',
                thresholdBytes: 1,
                chunkSizeBytes: PART,
                maxConcurrentParts: 1,
            },
        })
        const allComplete = vi.fn<(files: UploadFile[]) => void>()
        const fileSuccess = vi.fn()
        core.on('upload-all-complete', allComplete)
        core.on('upload-success', fileSuccess)

        await core.addFiles([
            new File([new ArrayBuffer(3 * PART)], 'clip.mp4', {
                type: 'video/mp4',
                lastModified: 1_700_000_000_000,
            }),
        ])
        await core.upload()
        expect(core.status).toBe(UploadStatus.PAUSED)
        expect(stored).toEqual([1])
        expect(allComplete).not.toHaveBeenCalled()

        online = true
        win.fire('online')
        await vi.waitFor(() => {
            expect(core.status).toBe(UploadStatus.SUCCESSFUL)
        })

        // The resume continued the same server-side upload rather than
        // starting over: one init, one resume, parts 2 and 3 only.
        expect(routes.filter(r => r === '/multipart/init')).toHaveLength(1)
        expect(routes.filter(r => r === '/multipart/resume')).toHaveLength(1)
        expect(routes.at(-1)).toBe('/multipart/complete')
        expect(stored).toEqual([1, 2, 3])

        expect(fileSuccess).toHaveBeenCalledTimes(1)
        expect(allComplete).toHaveBeenCalledTimes(1)
        const completed = allComplete.mock.calls[0]?.[0] ?? []
        expect(completed.map(file => file.key)).toEqual([KEY])
        core.destroy()
    })

    it('emits upload-all-complete once after a manual pause() then resume()', async () => {
        const core = new UpupCore({
            provider: 'aws',
            serverUrl: SERVER_URL,
            maxRetries: 0,
            networkAware: false,
            resumable: {
                protocol: 'multipart',
                thresholdBytes: 1,
                chunkSizeBytes: PART,
                maxConcurrentParts: 1,
            },
        })
        const stored: number[] = []
        let paused = false
        puts.mockImplementation((req: PartRequest) => {
            const partNumber = Number(/part(\d+)/.exec(req.url)?.[1])
            if (partNumber === 2 && !paused) {
                paused = true
                core.pause()
                return new Promise<PartResponse>(() => {})
            }
            stored.push(partNumber)
            return Promise.resolve({
                status: 200,
                headers: { ETag: `"etag-${partNumber}"` },
            })
        })
        stubServer(() => stored.slice())

        const allComplete = vi.fn<(files: UploadFile[]) => void>()
        core.on('upload-all-complete', allComplete)

        await core.addFiles([
            new File([new ArrayBuffer(3 * PART)], 'clip.mp4', {
                type: 'video/mp4',
                lastModified: 1_700_000_000_000,
            }),
        ])
        await core.upload()
        expect(core.status).toBe(UploadStatus.PAUSED)

        core.resume()
        await vi.waitFor(() => {
            expect(core.status).toBe(UploadStatus.SUCCESSFUL)
        })

        expect(allComplete).toHaveBeenCalledTimes(1)
        core.destroy()
    })
})
