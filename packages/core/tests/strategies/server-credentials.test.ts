import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ServerCredentials } from '../../src/strategies/server-credentials'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('ServerCredentials', () => {
    const baseUrl = 'https://api.example.com/upup'
    let strategy: ServerCredentials

    beforeEach(() => {
        vi.clearAllMocks()
        strategy = new ServerCredentials({ serverUrl: baseUrl })
    })

    describe('getPresignedUrl', () => {
        it('POSTs to /presign with file metadata', async () => {
            const presigned = {
                key: 'uploads/test.png',
                publicUrl: 'https://cdn.example.com/test.png',
                uploadUrl: 'https://s3.amazonaws.com/bucket/test.png?signed',
                expiresIn: 3600,
            }
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(presigned),
            })

            const result = await strategy.getPresignedUrl({
                name: 'test.png',
                size: 1024,
                type: 'image/png',
            })

            expect(mockFetch).toHaveBeenCalledWith(
                `${baseUrl}/presign`,
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                    }),
                    body: JSON.stringify({
                        name: 'test.png',
                        size: 1024,
                        type: 'image/png',
                        metadata: {},
                    }),
                }),
            )
            expect(result).toEqual(presigned)
        })

        it('includes custom headers when provided', async () => {
            strategy = new ServerCredentials({
                serverUrl: baseUrl,
                headers: { Authorization: 'Bearer tok_123' },
            })
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () =>
                    Promise.resolve({
                        key: 'k',
                        publicUrl: '',
                        uploadUrl: '',
                        expiresIn: 0,
                    }),
            })

            await strategy.getPresignedUrl({ name: 'f', size: 1, type: 't' })

            expect(mockFetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        Authorization: 'Bearer tok_123',
                    }),
                }),
            )
        })

        it('allows x-api-key through explicit headers', async () => {
            strategy = new ServerCredentials({
                serverUrl: baseUrl,
                headers: { 'x-api-key': 'key_abc' },
            })
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () =>
                    Promise.resolve({
                        key: 'k',
                        publicUrl: '',
                        uploadUrl: '',
                        expiresIn: 0,
                    }),
            })

            await strategy.getPresignedUrl({ name: 'f', size: 1, type: 't' })

            expect(mockFetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'x-api-key': 'key_abc',
                    }),
                }),
            )
        })

        it('throws a typed error on non-ok response', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 401,
                statusText: 'Unauthorized',
                text: () => Promise.resolve(''),
            })

            const err = await strategy
                .getPresignedUrl({ name: 'f', size: 1, type: 't' })
                .catch(e => e)
            expect(err.status).toBe(401)
            expect(err.message).toContain('401')
        })

        it('reads the response body and surfaces the server machine code (P4/C6)', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 403,
                statusText: 'Forbidden',
                text: () =>
                    Promise.resolve(
                        JSON.stringify({
                            error: 'Invalid upload token',
                            code: 'bad_signature',
                        }),
                    ),
            })

            const err = await strategy
                .getPresignedUrl({ name: 'f', size: 1, type: 't' })
                .catch(e => e)
            expect(err.code).toBe('bad_signature')
            expect(err.status).toBe(403)
        })
    })

    describe('initMultipartUpload', () => {
        it('POSTs to /multipart/init with file metadata', async () => {
            const initResult = {
                key: 'uploads/big.zip',
                uploadId: 'upload-123',
                partSize: 5242880,
                expiresIn: 3600,
            }
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(initResult),
            })

            const result = await strategy.initMultipartUpload({
                name: 'big.zip',
                size: 100_000_000,
                type: 'application/zip',
            })

            expect(mockFetch).toHaveBeenCalledWith(
                `${baseUrl}/multipart/init`,
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({
                        name: 'big.zip',
                        size: 100_000_000,
                        type: 'application/zip',
                        metadata: {},
                    }),
                }),
            )
            expect(result).toEqual(initResult)
        })
    })

    describe('signPart', () => {
        it('POSTs to /multipart/sign-part', async () => {
            const signResult = {
                uploadUrl: 'https://s3/part?signed',
                expiresIn: 3600,
            }
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(signResult),
            })

            const result = await strategy.signPart({
                token: 'tok-1',
                partNumber: 1,
            })

            expect(mockFetch).toHaveBeenCalledWith(
                `${baseUrl}/multipart/sign-part`,
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({ token: 'tok-1', partNumber: 1 }),
                }),
            )
            expect(result).toEqual(signResult)
        })
    })

    describe('completeMultipartUpload', () => {
        it('POSTs to /multipart/complete', async () => {
            const completeResult = {
                key: 'uploads/big.zip',
                publicUrl: 'https://cdn.example.com/big.zip',
                etag: '"abc123"',
            }
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(completeResult),
            })

            const parts = [
                { partNumber: 1, eTag: '"aaa"' },
                { partNumber: 2, eTag: '"bbb"' },
            ]
            const result = await strategy.completeMultipartUpload({
                token: 'tok-1',
                parts,
            })

            expect(mockFetch).toHaveBeenCalledWith(
                `${baseUrl}/multipart/complete`,
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({ token: 'tok-1', parts }),
                }),
            )
            expect(result).toEqual(completeResult)
        })
    })

    describe('abortMultipartUpload', () => {
        it('POSTs to /multipart/abort', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ ok: true }),
            })

            await strategy.abortMultipartUpload({ token: 'tok-1' })

            expect(mockFetch).toHaveBeenCalledWith(
                `${baseUrl}/multipart/abort`,
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({ token: 'tok-1' }),
                }),
            )
        })
    })
})
