// Contract: a multipart upload configured with `persist` must survive the
// process that started it. A saved session lets the next attempt (page reload,
// pause/resume, UploadManager retry) re-attach to the SAME server-side upload
// and skip the parts storage already holds — but only when the session
// provably belongs to this server and this file. Every mismatch, and every
// resume failure, must silently degrade to a fresh init rather than fail an
// upload a fresh start could still serve.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
    MultipartUpload,
    abortPersistedMultipartSessions,
} from '../../src/strategies/multipart-upload'
import {
    fileFingerprint,
    loadSession,
    saveSession,
    type MultipartSession,
} from '../../src/utils/multipart-session-store'
import { UpupNetworkError, uploadErrorFromResponse } from '../../src/errors'
import type {
    CredentialStrategy,
    UploadCredentials,
} from '../../src/contracts-strategies'

// Minimal in-memory Storage stand-in — test infrastructure bridging the Web
// Storage API the session store expects onto vitest's `node` environment (no
// real localStorage), not a mock of the code under test. Mirrors the shim in
// tests/multipart-session-store-persistence-ttl-and-corruption-recovery.test.ts.
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

const MIB = 1024 * 1024
const PART_SIZE = 5 * MIB
const FILE_SIZE = 12 * MIB // 3 parts: 5 MiB, 5 MiB, 2 MiB
const SERVER_URL = 'https://api.example.com/upup'

// MultipartUpload never reads its `credentials` param (multipart auth flows
// through the CredentialStrategy instead) — a minimal well-typed stand-in
// satisfies the UploadStrategy#upload signature.
const unusedCredentials: UploadCredentials = {
    key: 'unused',
    uploadUrl: 'unused',
    expiresIn: 0,
}

function makeFile(name = 'big.zip'): File {
    return new File([new ArrayBuffer(FILE_SIZE)], name, {
        type: 'application/zip',
        lastModified: 1_700_000_000_000,
    })
}

function makeSession(overrides: Partial<MultipartSession> = {}) {
    return {
        token: 'saved-token',
        key: 'uploads/big.zip',
        partSize: PART_SIZE,
        updatedAt: Date.now(),
        uploadedBytes: 0,
        scope: SERVER_URL,
        ...overrides,
    }
}

// Return type deliberately inferred: the callers reach for `.mockResolvedValue`
// / `.mockImplementation` on individual members, which a CredentialStrategy
// annotation would erase.
function makeCredentials() {
    return {
        getPresignedUrl: vi.fn(),
        initMultipartUpload: vi.fn().mockResolvedValue({
            key: 'uploads/big.zip',
            uploadId: 'upload-1',
            partSize: PART_SIZE,
            expiresIn: 3600,
            token: 'init-token',
        }),
        signPart: vi.fn().mockImplementation(async ({ partNumber }) => ({
            uploadUrl: `https://s3/part${partNumber}?signed`,
            expiresIn: 3600,
        })),
        completeMultipartUpload: vi.fn().mockResolvedValue({
            key: 'uploads/big.zip',
            publicUrl: 'https://cdn/big.zip',
            etag: '"final"',
        }),
        abortMultipartUpload: vi.fn().mockResolvedValue(undefined),
        resumeMultipartUpload: vi.fn(),
    }
}

/** The 403 `@upupjs/server` answers with when an upload token has aged out:
 *  `{ error: 'Invalid upload token', code: 'expired' }`. */
function expiredTokenError(): Error {
    return uploadErrorFromResponse({
        status: 403,
        statusText: 'Forbidden',
        body: JSON.stringify({
            error: 'Invalid upload token',
            code: 'expired',
        }),
        kind: 'storage',
        operation: 'multipart-sign-part',
    })
}

function storageError(
    status: number,
    operation: 'multipart-resume' | 'multipart-complete',
): Error {
    return uploadErrorFromResponse({
        status,
        statusText: 'Rejected',
        body: JSON.stringify({ error: 'nope', code: 'not_found' }),
        kind: 'storage',
        operation,
    })
}

const mockFetch = vi.fn()

describe('MultipartUpload — cross-reload resume', () => {
    let storage: MemoryStorage

    beforeEach(() => {
        vi.clearAllMocks()
        storage = new MemoryStorage()
        vi.stubGlobal('localStorage', storage)
        mockFetch.mockImplementation(async (url: string) => ({
            ok: true,
            status: 200,
            headers: new Headers({
                ETag: `"etag-${/part(\d+)/.exec(url)?.[1] ?? 'x'}"`,
            }),
        }))
        vi.stubGlobal('fetch', mockFetch)
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    function makeStrategy(
        credentials: CredentialStrategy,
        persist = true,
    ): MultipartUpload {
        return new MultipartUpload({
            credentials,
            chunkSizeBytes: PART_SIZE,
            maxConcurrentParts: 3,
            persist,
            sessionScope: SERVER_URL,
        })
    }

    describe('re-attaching to a saved session', () => {
        it('skips the parts the server already holds and uploads only what is missing', async () => {
            const file = makeFile()
            saveSession(fileFingerprint(file), makeSession())
            const creds = makeCredentials()
            creds.resumeMultipartUpload.mockResolvedValue({
                key: 'uploads/big.zip',
                token: 'fresh-token',
                parts: [
                    { partNumber: 1, eTag: '"e1"', size: PART_SIZE },
                    { partNumber: 2, eTag: '"e2"', size: PART_SIZE },
                ],
            })

            await makeStrategy(creds).upload(file, unusedCredentials, {
                onProgress: vi.fn(),
                signal: new AbortController().signal,
            })

            expect(creds.initMultipartUpload).not.toHaveBeenCalled()
            expect(creds.resumeMultipartUpload).toHaveBeenCalledWith({
                token: 'saved-token',
            })
            expect(creds.signPart).toHaveBeenCalledTimes(1)
            expect(creds.signPart).toHaveBeenCalledWith({
                token: 'fresh-token',
                partNumber: 3,
            })
            expect(mockFetch).toHaveBeenCalledTimes(1)
        })

        it('completes with the resumed parts merged into the newly uploaded ones, in part order', async () => {
            const file = makeFile()
            saveSession(fileFingerprint(file), makeSession())
            const creds = makeCredentials()
            creds.resumeMultipartUpload.mockResolvedValue({
                key: 'uploads/big.zip',
                token: 'fresh-token',
                parts: [
                    { partNumber: 2, eTag: '"e2"', size: PART_SIZE },
                    { partNumber: 1, eTag: '"e1"', size: PART_SIZE },
                ],
            })

            await makeStrategy(creds).upload(file, unusedCredentials, {
                onProgress: vi.fn(),
                signal: new AbortController().signal,
            })

            expect(creds.completeMultipartUpload).toHaveBeenCalledWith({
                token: 'fresh-token',
                parts: [
                    { partNumber: 1, eTag: '"e1"' },
                    { partNumber: 2, eTag: '"e2"' },
                    { partNumber: 3, eTag: '"etag-3"' },
                ],
            })
        })

        it('goes straight to complete without signing anything when every part is already stored', async () => {
            const file = makeFile()
            saveSession(fileFingerprint(file), makeSession())
            const creds = makeCredentials()
            creds.resumeMultipartUpload.mockResolvedValue({
                key: 'uploads/big.zip',
                token: 'fresh-token',
                parts: [
                    { partNumber: 1, eTag: '"e1"', size: PART_SIZE },
                    { partNumber: 2, eTag: '"e2"', size: PART_SIZE },
                    { partNumber: 3, eTag: '"e3"', size: 2 * MIB },
                ],
            })

            await makeStrategy(creds).upload(file, unusedCredentials, {
                onProgress: vi.fn(),
                signal: new AbortController().signal,
            })

            expect(creds.signPart).not.toHaveBeenCalled()
            expect(mockFetch).not.toHaveBeenCalled()
            expect(creds.completeMultipartUpload).toHaveBeenCalledTimes(1)
        })

        it('reports the already-uploaded offset before moving a byte, then stays monotonic to the full size', async () => {
            const file = makeFile()
            saveSession(fileFingerprint(file), makeSession())
            const creds = makeCredentials()
            creds.resumeMultipartUpload.mockResolvedValue({
                key: 'uploads/big.zip',
                token: 'fresh-token',
                parts: [
                    { partNumber: 1, eTag: '"e1"', size: PART_SIZE },
                    { partNumber: 2, eTag: '"e2"', size: PART_SIZE },
                ],
            })
            const onProgress = vi.fn()

            await makeStrategy(creds).upload(file, unusedCredentials, {
                onProgress,
                signal: new AbortController().signal,
            })

            const loaded = onProgress.mock.calls.map(call => call[0] as number)
            expect(loaded[0]).toBe(10 * MIB)
            expect(loaded[loaded.length - 1]).toBe(FILE_SIZE)
            expect([...loaded].sort((a, b) => a - b)).toEqual(loaded)
            expect(
                onProgress.mock.calls.every(call => call[1] === FILE_SIZE),
            ).toBe(true)
        })

        it('writes the freshly-issued token back to the saved session so a second reload presents it', async () => {
            const file = makeFile()
            const fingerprint = fileFingerprint(file)
            saveSession(fingerprint, makeSession())
            const creds = makeCredentials()
            creds.resumeMultipartUpload.mockResolvedValue({
                key: 'uploads/big.zip',
                token: 'fresh-token',
                parts: [{ partNumber: 1, eTag: '"e1"', size: PART_SIZE }],
            })
            let tokenSeenMidFlight: string | undefined
            creds.signPart.mockImplementation(async ({ partNumber }) => {
                tokenSeenMidFlight ??= loadSession(fingerprint)?.token
                return {
                    uploadUrl: `https://s3/part${partNumber}?signed`,
                    expiresIn: 3600,
                }
            })

            await makeStrategy(creds).upload(file, unusedCredentials, {
                onProgress: vi.fn(),
                signal: new AbortController().signal,
            })

            expect(tokenSeenMidFlight).toBe('fresh-token')
        })

        it('clears the session once the upload completes, so the next selection starts clean', async () => {
            const file = makeFile()
            const fingerprint = fileFingerprint(file)
            saveSession(fingerprint, makeSession())
            const creds = makeCredentials()
            creds.resumeMultipartUpload.mockResolvedValue({
                key: 'uploads/big.zip',
                token: 'fresh-token',
                parts: [{ partNumber: 1, eTag: '"e1"', size: PART_SIZE }],
            })

            await makeStrategy(creds).upload(file, unusedCredentials, {
                onProgress: vi.fn(),
                signal: new AbortController().signal,
            })

            expect(loadSession(fingerprint)).toBeNull()
        })
    })

    describe('refusing a session that does not provably belong here', () => {
        it('starts fresh and drops the session when it was saved against a different server', async () => {
            const file = makeFile()
            const fingerprint = fileFingerprint(file)
            saveSession(
                fingerprint,
                makeSession({ scope: 'https://other.example.com/upup' }),
            )
            const creds = makeCredentials()

            await makeStrategy(creds).upload(file, unusedCredentials, {
                onProgress: vi.fn(),
                signal: new AbortController().signal,
            })

            expect(creds.resumeMultipartUpload).not.toHaveBeenCalled()
            expect(creds.initMultipartUpload).toHaveBeenCalledTimes(1)
            expect(creds.signPart).toHaveBeenCalledTimes(3)
        })

        it('starts fresh when a returned part that is not the last one is shorter than the session part size', async () => {
            const file = makeFile()
            const fingerprint = fileFingerprint(file)
            saveSession(fingerprint, makeSession())
            const creds = makeCredentials()
            creds.resumeMultipartUpload.mockResolvedValue({
                key: 'uploads/big.zip',
                token: 'fresh-token',
                parts: [
                    { partNumber: 1, eTag: '"e1"', size: 1 * MIB },
                    { partNumber: 2, eTag: '"e2"', size: PART_SIZE },
                ],
            })

            await makeStrategy(creds).upload(file, unusedCredentials, {
                onProgress: vi.fn(),
                signal: new AbortController().signal,
            })

            expect(creds.initMultipartUpload).toHaveBeenCalledTimes(1)
            expect(creds.signPart).toHaveBeenCalledTimes(3)
            expect(creds.completeMultipartUpload).toHaveBeenCalledWith(
                expect.objectContaining({ token: 'init-token' }),
            )
        })

        it('starts fresh when the saved content hash disagrees with the file being uploaded', async () => {
            const file = Object.assign(makeFile(), {
                metadata: { originalContentHash: 'sha256-new' },
            })
            saveSession(
                fileFingerprint(file),
                makeSession({ contentHash: 'sha256-old' }),
            )
            const creds = makeCredentials()

            await makeStrategy(creds).upload(file, unusedCredentials, {
                onProgress: vi.fn(),
                signal: new AbortController().signal,
            })

            expect(creds.resumeMultipartUpload).not.toHaveBeenCalled()
            expect(creds.initMultipartUpload).toHaveBeenCalledTimes(1)
        })

        it('still resumes when only one side recorded a content hash', async () => {
            const file = Object.assign(makeFile(), {
                metadata: { originalContentHash: 'sha256-new' },
            })
            saveSession(fileFingerprint(file), makeSession())
            const creds = makeCredentials()
            creds.resumeMultipartUpload.mockResolvedValue({
                key: 'uploads/big.zip',
                token: 'fresh-token',
                parts: [{ partNumber: 1, eTag: '"e1"', size: PART_SIZE }],
            })

            await makeStrategy(creds).upload(file, unusedCredentials, {
                onProgress: vi.fn(),
                signal: new AbortController().signal,
            })

            expect(creds.initMultipartUpload).not.toHaveBeenCalled()
            expect(creds.signPart).toHaveBeenCalledTimes(2)
        })
    })

    describe('falling back when the resume call itself fails', () => {
        it('starts a fresh upload and forgets the session when the server says the upload is gone', async () => {
            const file = makeFile()
            const fingerprint = fileFingerprint(file)
            saveSession(fingerprint, makeSession())
            const creds = makeCredentials()
            creds.resumeMultipartUpload.mockRejectedValue(
                storageError(404, 'multipart-resume'),
            )

            await makeStrategy(creds).upload(file, unusedCredentials, {
                onProgress: vi.fn(),
                signal: new AbortController().signal,
            })

            expect(creds.initMultipartUpload).toHaveBeenCalledTimes(1)
            expect(creds.signPart).toHaveBeenCalledTimes(3)
            expect(creds.completeMultipartUpload).toHaveBeenCalledWith(
                expect.objectContaining({ token: 'init-token' }),
            )
            // The dead session was replaced by the fresh one, which the
            // successful complete then cleared.
            expect(loadSession(fingerprint)).toBeNull()
        })

        it('keeps the session for a later attempt when the resume call dies on the network', async () => {
            const file = makeFile()
            const fingerprint = fileFingerprint(file)
            saveSession(fingerprint, makeSession())
            const creds = makeCredentials()
            creds.resumeMultipartUpload.mockRejectedValue(
                new UpupNetworkError('offline'),
            )
            creds.initMultipartUpload.mockRejectedValue(
                new UpupNetworkError('offline'),
            )

            await expect(
                makeStrategy(creds).upload(file, unusedCredentials, {
                    onProgress: vi.fn(),
                    signal: new AbortController().signal,
                }),
            ).rejects.toThrow('offline')

            expect(loadSession(fingerprint)?.token).toBe('saved-token')
        })

        it('starts fresh when the credential strategy cannot resume at all', async () => {
            const file = makeFile()
            saveSession(fileFingerprint(file), makeSession())
            const creds = makeCredentials()
            const withoutResume: CredentialStrategy = {
                getPresignedUrl: creds.getPresignedUrl,
                initMultipartUpload: creds.initMultipartUpload,
                signPart: creds.signPart,
                completeMultipartUpload: creds.completeMultipartUpload,
                abortMultipartUpload: creds.abortMultipartUpload,
            }

            await makeStrategy(withoutResume).upload(file, unusedCredentials, {
                onProgress: vi.fn(),
                signal: new AbortController().signal,
            })

            expect(creds.initMultipartUpload).toHaveBeenCalledTimes(1)
        })
    })

    describe('saving a session for a fresh upload', () => {
        it('records the init token, key, part size and scope — and never the uploadId', async () => {
            const file = makeFile()
            const fingerprint = fileFingerprint(file)
            const creds = makeCredentials()
            let saved: MultipartSession | null = null
            creds.signPart.mockImplementation(async ({ partNumber }) => {
                saved ??= loadSession(fingerprint)
                return {
                    uploadUrl: `https://s3/part${partNumber}?signed`,
                    expiresIn: 3600,
                }
            })

            await makeStrategy(creds).upload(file, unusedCredentials, {
                onProgress: vi.fn(),
                signal: new AbortController().signal,
            })

            expect(saved).toMatchObject({
                token: 'init-token',
                key: 'uploads/big.zip',
                partSize: PART_SIZE,
                scope: SERVER_URL,
            })
            expect(Object.keys(saved ?? {})).not.toContain('uploadId')
        })

        it('does not persist anything for a Blob, which carries no fingerprintable identity', async () => {
            const blob = new Blob([new ArrayBuffer(FILE_SIZE)], {
                type: 'application/zip',
            })
            const creds = makeCredentials()

            await makeStrategy(creds).upload(blob, unusedCredentials, {
                onProgress: vi.fn(),
                signal: new AbortController().signal,
            })

            expect(storage.length).toBe(0)
        })

        it('does not persist anything when persistence is switched off', async () => {
            const creds = makeCredentials()

            await makeStrategy(creds, false).upload(
                makeFile(),
                unusedCredentials,
                {
                    onProgress: vi.fn(),
                    signal: new AbortController().signal,
                },
            )

            expect(storage.length).toBe(0)
            expect(creds.resumeMultipartUpload).not.toHaveBeenCalled()
        })
    })

    describe('what a failure leaves behind', () => {
        it('leaves the server-side upload intact so a retry can resume into it', async () => {
            const file = makeFile()
            const fingerprint = fileFingerprint(file)
            const creds = makeCredentials()
            mockFetch.mockResolvedValue({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
                text: () => Promise.resolve(''),
                headers: new Headers(),
            })

            await expect(
                makeStrategy(creds).upload(file, unusedCredentials, {
                    onProgress: vi.fn(),
                    signal: new AbortController().signal,
                }),
            ).rejects.toThrow()

            expect(creds.abortMultipartUpload).not.toHaveBeenCalled()
            expect(loadSession(fingerprint)?.token).toBe('init-token')
        })

        it('still aborts server-side on failure when persistence is switched off', async () => {
            const creds = makeCredentials()
            mockFetch.mockResolvedValue({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
                text: () => Promise.resolve(''),
                headers: new Headers(),
            })

            await expect(
                makeStrategy(creds, false).upload(
                    makeFile(),
                    unusedCredentials,
                    {
                        onProgress: vi.fn(),
                        signal: new AbortController().signal,
                    },
                ),
            ).rejects.toThrow()

            expect(creds.abortMultipartUpload).toHaveBeenCalledWith({
                token: 'init-token',
            })
        })

        it('drops the session when complete is rejected outright — the server already tore the upload down', async () => {
            const file = makeFile()
            const fingerprint = fileFingerprint(file)
            const creds = makeCredentials()
            creds.completeMultipartUpload.mockRejectedValue(
                storageError(400, 'multipart-complete'),
            )

            await expect(
                makeStrategy(creds).upload(file, unusedCredentials, {
                    onProgress: vi.fn(),
                    signal: new AbortController().signal,
                }),
            ).rejects.toThrow()

            expect(loadSession(fingerprint)).toBeNull()
        })

        it('keeps the session across an aborted run, which is what makes pause resumable', async () => {
            const file = makeFile()
            const fingerprint = fileFingerprint(file)
            const creds = makeCredentials()
            const controller = new AbortController()
            creds.signPart.mockImplementation(async () => {
                controller.abort()
                return { uploadUrl: 'https://s3/part?signed', expiresIn: 3600 }
            })
            mockFetch.mockRejectedValue(
                new DOMException('Aborted', 'AbortError'),
            )

            await expect(
                makeStrategy(creds).upload(file, unusedCredentials, {
                    onProgress: vi.fn(),
                    signal: controller.signal,
                }),
            ).rejects.toThrow()

            expect(creds.abortMultipartUpload).not.toHaveBeenCalled()
            expect(loadSession(fingerprint)?.token).toBe('init-token')
        })
    })

    describe('mid-flight token refresh', () => {
        it('rotates an expired token through resume and retries the signing call once', async () => {
            const file = makeFile()
            const creds = makeCredentials()
            creds.resumeMultipartUpload.mockResolvedValue({
                key: 'uploads/big.zip',
                token: 'renewed-token',
                parts: [],
            })
            let firstAttempt = true
            creds.signPart.mockImplementation(async ({ partNumber }) => {
                if (firstAttempt) {
                    firstAttempt = false
                    throw expiredTokenError()
                }
                return {
                    uploadUrl: `https://s3/part${partNumber}?signed`,
                    expiresIn: 3600,
                }
            })

            await makeStrategy(creds).upload(file, unusedCredentials, {
                onProgress: vi.fn(),
                signal: new AbortController().signal,
            })

            expect(creds.resumeMultipartUpload).toHaveBeenCalledTimes(1)
            expect(creds.completeMultipartUpload).toHaveBeenCalledWith(
                expect.objectContaining({ token: 'renewed-token' }),
            )
        })

        it('refreshes exactly once even when all three concurrent part uploaders hit the expiry together', async () => {
            const file = makeFile()
            const creds = makeCredentials()
            creds.resumeMultipartUpload.mockResolvedValue({
                key: 'uploads/big.zip',
                token: 'renewed-token',
                parts: [],
            })
            const seenExpiry = new Set<number>()
            creds.signPart.mockImplementation(async ({ partNumber }) => {
                if (!seenExpiry.has(partNumber)) {
                    seenExpiry.add(partNumber)
                    throw expiredTokenError()
                }
                return {
                    uploadUrl: `https://s3/part${partNumber}?signed`,
                    expiresIn: 3600,
                }
            })

            await makeStrategy(creds).upload(file, unusedCredentials, {
                onProgress: vi.fn(),
                signal: new AbortController().signal,
            })

            expect(seenExpiry.size).toBe(3)
            expect(creds.resumeMultipartUpload).toHaveBeenCalledTimes(1)
            expect(creds.signPart).toHaveBeenCalledTimes(6)
        })

        it('surfaces the original expiry error when the refresh cannot produce a new token', async () => {
            const file = makeFile()
            const creds = makeCredentials()
            creds.resumeMultipartUpload.mockRejectedValue(
                storageError(404, 'multipart-resume'),
            )
            creds.signPart.mockImplementation(async ({ partNumber }) => {
                if (partNumber === 1) throw expiredTokenError()
                return {
                    uploadUrl: `https://s3/part${partNumber}?signed`,
                    expiresIn: 3600,
                }
            })

            const error = await makeStrategy(creds)
                .upload(file, unusedCredentials, {
                    onProgress: vi.fn(),
                    signal: new AbortController().signal,
                })
                .catch((e: unknown) => e)

            expect((error as { code?: string }).code).toBe('expired')
        })
    })

    describe('abortPersistedMultipartSessions', () => {
        it('aborts the server-side upload and clears the session of a cancelled file', () => {
            const file = makeFile()
            const fingerprint = fileFingerprint(file)
            saveSession(fingerprint, makeSession({ token: 'doomed-token' }))
            const creds = makeCredentials()

            abortPersistedMultipartSessions([file], creds)

            expect(creds.abortMultipartUpload).toHaveBeenCalledWith({
                token: 'doomed-token',
            })
            expect(loadSession(fingerprint)).toBeNull()
        })

        it('leaves files with no saved session completely alone', () => {
            const creds = makeCredentials()

            abortPersistedMultipartSessions([makeFile()], creds)

            expect(creds.abortMultipartUpload).not.toHaveBeenCalled()
        })

        it('never throws when the abort call itself rejects', () => {
            const file = makeFile()
            saveSession(fileFingerprint(file), makeSession())
            const creds = makeCredentials()
            creds.abortMultipartUpload.mockRejectedValue(
                new UpupNetworkError('offline'),
            )

            expect(() => {
                abortPersistedMultipartSessions([file], creds)
            }).not.toThrow()
        })

        it('skips Blobs, which have no fingerprint to look a session up by', () => {
            const creds = makeCredentials()

            abortPersistedMultipartSessions(
                [new Blob([new ArrayBuffer(8)])],
                creds,
            )

            expect(creds.abortMultipartUpload).not.toHaveBeenCalled()
        })
    })
})
