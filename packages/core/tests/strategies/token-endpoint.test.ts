import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TokenEndpointCredentials } from '../../src/strategies/token-endpoint'
import { UpupNetworkError, type UpupError } from '@useupup/core'

const FILE_META = { name: 'photo.jpg', size: 1024, type: 'image/jpeg' }

// The mocked global fetch's recorded call args, typed to what these tests
// actually read off them (narrower than the real RequestInit union, which
// isn't directly indexable) — cast at this mock-introspection boundary.
interface FetchCallOpts {
    method: string
    headers: Record<string, string>
    body: string
}

// ─────────────────────────────────────────────
// Constructor behaviour
// ─────────────────────────────────────────────
describe('TokenEndpointCredentials — constructor', () => {
    it('instantiates without throwing', () => {
        expect(
            () =>
                new TokenEndpointCredentials({
                    url: 'https://example.com/presign',
                }),
        ).not.toThrow()
    })

    it('accepts optional headers', () => {
        expect(
            () =>
                new TokenEndpointCredentials({
                    url: 'https://example.com/presign',
                    headers: { Authorization: 'Bearer token' },
                }),
        ).not.toThrow()
    })

    it('has a getPresignedUrl method', () => {
        const creds = new TokenEndpointCredentials({
            url: 'https://example.com/presign',
        })
        expect(typeof creds.getPresignedUrl).toBe('function')
    })
})

// ─────────────────────────────────────────────
// getPresignedUrl — success path
// ─────────────────────────────────────────────
describe('TokenEndpointCredentials — getPresignedUrl success', () => {
    const mockResponse = {
        url: 'https://s3.example.com/upload',
        key: 'uploads/photo.jpg',
    }

    beforeEach(() => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockResponse),
            }),
        )
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('calls fetch with the configured URL', async () => {
        const creds = new TokenEndpointCredentials({
            url: 'https://example.com/presign',
        })
        await creds.getPresignedUrl(FILE_META)
        expect(fetch).toHaveBeenCalledWith(
            'https://example.com/presign',
            expect.any(Object),
        )
    })

    it('sends a POST request', async () => {
        const creds = new TokenEndpointCredentials({
            url: 'https://example.com/presign',
        })
        await creds.getPresignedUrl(FILE_META)
        const [, opts] = vi.mocked(fetch).mock.calls[0] as unknown as [
            string,
            FetchCallOpts,
        ]
        expect(opts.method).toBe('POST')
    })

    it('sends Content-Type: application/json', async () => {
        const creds = new TokenEndpointCredentials({
            url: 'https://example.com/presign',
        })
        await creds.getPresignedUrl(FILE_META)
        const [, opts] = vi.mocked(fetch).mock.calls[0] as unknown as [
            string,
            FetchCallOpts,
        ]
        expect(opts.headers['Content-Type']).toBe('application/json')
    })

    it('sends file metadata in the request body', async () => {
        const creds = new TokenEndpointCredentials({
            url: 'https://example.com/presign',
        })
        await creds.getPresignedUrl(FILE_META)
        const [, opts] = vi.mocked(fetch).mock.calls[0] as unknown as [
            string,
            FetchCallOpts,
        ]
        const body = JSON.parse(opts.body)
        expect(body.name).toBe('photo.jpg')
        expect(body.size).toBe(1024)
        expect(body.type).toBe('image/jpeg')
    })

    it('merges extra headers alongside Content-Type', async () => {
        const creds = new TokenEndpointCredentials({
            url: 'https://example.com/presign',
            headers: { Authorization: 'Bearer abc' },
        })
        await creds.getPresignedUrl(FILE_META)
        const [, opts] = vi.mocked(fetch).mock.calls[0] as unknown as [
            string,
            FetchCallOpts,
        ]
        expect(opts.headers['Authorization']).toBe('Bearer abc')
        expect(opts.headers['Content-Type']).toBe('application/json')
    })

    it('returns the parsed JSON response', async () => {
        const creds = new TokenEndpointCredentials({
            url: 'https://example.com/presign',
        })
        const result = await creds.getPresignedUrl(FILE_META)
        expect(result).toEqual(mockResponse)
    })
})

// ─────────────────────────────────────────────
// getPresignedUrl — error path
// ─────────────────────────────────────────────
describe('TokenEndpointCredentials — getPresignedUrl errors', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('throws UpupNetworkError when response is not ok (403)', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: false,
                status: 403,
                statusText: 'Forbidden',
            }),
        )
        const creds = new TokenEndpointCredentials({
            url: 'https://example.com/presign',
        })
        await expect(creds.getPresignedUrl(FILE_META)).rejects.toBeInstanceOf(
            UpupNetworkError,
        )
    })

    it('throws UpupNetworkError when response is 500', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
            }),
        )
        const creds = new TokenEndpointCredentials({
            url: 'https://example.com/presign',
        })
        await expect(creds.getPresignedUrl(FILE_META)).rejects.toBeInstanceOf(
            UpupNetworkError,
        )
    })

    it('includes the HTTP status in the thrown error', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: false,
                status: 401,
                statusText: 'Unauthorized',
            }),
        )
        const creds = new TokenEndpointCredentials({
            url: 'https://example.com/presign',
        })
        const err = await creds.getPresignedUrl(FILE_META).catch(e => e)
        expect(err.status).toBe(401)
    })

    it('propagates network-level fetch errors', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockRejectedValue(new Error('Network unreachable')),
        )
        const creds = new TokenEndpointCredentials({
            url: 'https://example.com/presign',
        })
        await expect(creds.getPresignedUrl(FILE_META)).rejects.toThrow(
            'Network unreachable',
        )
    })
})

// ─────────────────────────────────────────────
// getPresignedUrl — the endpoint's own error body
//
// A self-hosted token endpoint is where the host app enforces its own rules
// (plan limits, auth), and it writes the sentence it wants the user to read
// into the response body. This strategy used to throw the HTTP status line and
// nothing else, so that sentence was unreachable and consumers resorted to
// matching statuses out of upup's message text.
// ─────────────────────────────────────────────
describe('TokenEndpointCredentials — endpoint error body', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
    })

    function failWith(init: {
        status: number
        statusText: string
        body?: string
    }): TokenEndpointCredentials {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: false,
                status: init.status,
                statusText: init.statusText,
                text: () => Promise.resolve(init.body ?? ''),
            }),
        )
        return new TokenEndpointCredentials({
            url: 'https://example.com/presign',
        })
    }

    async function presignError(
        creds: TokenEndpointCredentials,
    ): Promise<UpupError> {
        return (await creds
            .getPresignedUrl(FILE_META)
            .catch((e: unknown) => e)) as UpupError
    }

    it("throws the endpoint's own message and code instead of the status line", async () => {
        const creds = failWith({
            status: 413,
            statusText: 'Payload Too Large',
            body: JSON.stringify({
                error: "File exceeds your plan's 4608MB limit. Upgrade for larger uploads.",
                code: 'PLAN_FILE_SIZE_EXCEEDED',
            }),
        })
        const err = await presignError(creds)
        expect(err.message).toBe(
            "File exceeds your plan's 4608MB limit. Upgrade for larger uploads.",
        )
        expect(err.code).toBe('PLAN_FILE_SIZE_EXCEEDED')
        expect(err.status).toBe(413)
    })

    it('lifts a `message` field that sits beside a non-string `error` flag', async () => {
        const creds = failWith({
            status: 413,
            statusText: 'Payload Too Large',
            body: JSON.stringify({
                message: "File exceeds your plan's 4608MB limit.",
                error: true,
            }),
        })
        const err = await presignError(creds)
        expect(err.message).toBe("File exceeds your plan's 4608MB limit.")
    })

    it('uses a plain-text error body verbatim', async () => {
        const creds = failWith({
            status: 403,
            statusText: 'Forbidden',
            body: 'Your sign-in expired before the upload started.',
        })
        const err = await presignError(creds)
        expect(err.message).toBe(
            'Your sign-in expired before the upload started.',
        )
    })

    it('still throws UpupNetworkError carrying the status', async () => {
        const creds = failWith({
            status: 500,
            statusText: 'Internal Server Error',
            body: JSON.stringify({ error: 'presign threw' }),
        })
        const err = await presignError(creds)
        expect(err).toBeInstanceOf(UpupNetworkError)
        expect(err.status).toBe(500)
    })

    it('keeps the legacy wording when the body is empty', async () => {
        const creds = failWith({ status: 413, statusText: 'Payload Too Large' })
        const err = await presignError(creds)
        expect(err.message).toBe(
            'Presign request failed: 413 Payload Too Large',
        )
    })

    it('keeps the legacy wording when the body cannot be read', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: false,
                status: 502,
                statusText: 'Bad Gateway',
                text: () => Promise.reject(new Error('body stream errored')),
            }),
        )
        const creds = new TokenEndpointCredentials({
            url: 'https://example.com/presign',
        })
        const err = await presignError(creds)
        expect(err.message).toBe('Presign request failed: 502 Bad Gateway')
        expect(err.status).toBe(502)
    })
})
