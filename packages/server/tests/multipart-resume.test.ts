// POST /multipart/resume — the cross-reload resume route's trust boundary.
//
// The route's whole reason to exist is that it accepts a token the other four
// routes would reject (expired `exp`), so these tests spend most of their effort
// proving what it does NOT relax: signature, shape, owner-binding, the key/
// uploadId bindings, and a hard resume window anchored at the ORIGINAL init that
// re-issuing can never push forward. The four existing routes' expired-token
// rejections are re-asserted here too — this route must not have leaked its one
// relaxation into them.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createUpupHandler } from '../src/handler'
import {
    signUploadToken,
    verifyUploadToken,
    DEFAULT_UPLOAD_TOKEN_TTL_SECONDS,
    type UploadTokenPayload,
} from '../src/uploadToken'

vi.mock('../src/providers/aws', () => ({
    generatePresignedUrl: vi.fn().mockResolvedValue({
        key: 'uuid-test.jpg',
        uploadUrl: 'https://bucket.s3.amazonaws.com/uuid-test.jpg?presigned',
        expiresIn: 3600,
    }),
    initiateMultipartUpload: vi.fn().mockResolvedValue({
        key: 'uuid-big.zip',
        uploadId: 'mp-123',
        partSize: 5 * 1024 * 1024,
        expiresIn: 3600,
    }),
    generatePresignedPartUrl: vi.fn().mockResolvedValue({
        uploadUrl: 'https://bucket.s3.amazonaws.com/part?presigned',
        expiresIn: 3600,
    }),
    completeMultipartUpload: vi.fn().mockResolvedValue({
        key: 'uuid-big.zip',
        downloadUrl: 'https://bucket.s3.amazonaws.com/uuid-big.zip?signed',
        etag: '"final"',
    }),
    abortMultipartUpload: vi.fn().mockResolvedValue({ ok: true }),
    listMultipartParts: vi.fn(),
    getMultipartUploadedSize: vi.fn().mockResolvedValue(0),
    checkStorageReachable: vi.fn().mockResolvedValue({ ok: true }),
}))

import { listMultipartParts } from '../src/providers/aws'

const listParts = vi.mocked(listMultipartParts)

const SECRET = 'multipart-resume-test-secret-0123456789'
const PART_SIZE = 5 * 1024 * 1024

const config = {
    storage: { type: 'aws', bucket: 'test-bucket', region: 'us-east-1' },
    uploadTokenSecret: SECRET,
    allowAnonymousUploads: true,
}

/** The two stored parts every happy-path case resumes into. */
const STORED_PARTS = [
    { partNumber: 1, eTag: '"etag-1"', size: PART_SIZE },
    { partNumber: 2, eTag: '"etag-2"', size: PART_SIZE },
]

type ResumeBody = {
    key?: string
    token?: string
    parts?: Array<{ partNumber: number; eTag: string; size?: number }>
    error?: string
    code?: string
    uploadId?: string
}

const nowSeconds = () => Math.floor(Date.now() / 1000)

/** Mint a token exactly as /multipart/init would have, `agedSeconds` ago. */
function mintToken(
    overrides: Partial<UploadTokenPayload> = {},
    agedSeconds = 0,
): Promise<string> {
    const issuedAt = nowSeconds() - agedSeconds
    return signUploadToken(SECRET, {
        k: 'alice/uuid/big.zip',
        u: 'mp-abc',
        uid: null,
        smin: 0,
        smax: 50 * 1024 * 1024,
        exp: issuedAt + DEFAULT_UPLOAD_TOKEN_TTL_SECONDS,
        iat: issuedAt,
        ...overrides,
    })
}

const post = (
    handler: (r: Request) => Promise<Response>,
    path: string,
    body: unknown,
    headers: Record<string, string> = {},
) =>
    handler(
        new Request(`http://localhost${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...headers },
            body: JSON.stringify(body),
        }),
    )

const resume = (
    handler: (r: Request) => Promise<Response>,
    token: string,
    headers?: Record<string, string>,
) => post(handler, '/multipart/resume', { token }, headers)

beforeEach(() => {
    listParts.mockReset()
    listParts.mockResolvedValue({ parts: STORED_PARTS })
})

describe('POST /multipart/resume — happy path', () => {
    it('returns the stored parts with their byte sizes and the token key', async () => {
        const handler = createUpupHandler(config)
        const res = await resume(handler, await mintToken())
        const body = (await res.json()) as ResumeBody

        expect(res.status).toBe(200)
        expect(body.key).toBe('alice/uuid/big.zip')
        expect(body.parts).toEqual(STORED_PARTS)
        // Size is mandatory on every part: the client silently restarts from
        // part 1 if any part cannot be size-checked against its own chunking.
        expect(body.parts?.every(p => typeof p.size === 'number')).toBe(true)
    })

    it('lists parts against the key and uploadId carried by the token', async () => {
        const handler = createUpupHandler(config)
        await resume(handler, await mintToken())

        expect(listParts).toHaveBeenCalledWith(
            config.storage,
            'alice/uuid/big.zip',
            'mp-abc',
        )
    })

    it('issues a token that is not the presented one but keeps every binding (k/u/uid/smin/smax)', async () => {
        const handler = createUpupHandler(config)
        const presented = await mintToken({ uid: null }, 120)
        const res = await resume(handler, presented)
        const body = (await res.json()) as ResumeBody

        expect(body.token).toBeDefined()
        expect(body.token).not.toBe(presented)

        const before = await verifyUploadToken(SECRET, presented, Date.now())
        const after = await verifyUploadToken(
            SECRET,
            body.token as string,
            Date.now(),
        )
        expect(after.k).toBe(before.k)
        expect(after.u).toBe(before.u)
        expect(after.uid).toBe(before.uid)
        expect(after.smin).toBe(before.smin)
        expect(after.smax).toBe(before.smax)
    })

    it('carries the ORIGINAL iat forward while moving exp to now + TTL, so rolling resumes cannot extend the window', async () => {
        const handler = createUpupHandler(config)
        const agedSeconds = 3 * 3600 // token already outlived its 1h TTL
        const presented = await mintToken({}, agedSeconds)
        const originalIat = (
            await verifyUploadToken(SECRET, presented, Date.now(), {
                allowExpired: true,
            })
        ).iat as number

        const body = (await (
            await resume(handler, presented)
        ).json()) as ResumeBody
        const refreshed = await verifyUploadToken(
            SECRET,
            body.token as string,
            Date.now(),
        )

        expect(refreshed.iat).toBe(originalIat)
        expect(refreshed.exp).toBeGreaterThan(nowSeconds())
        expect(refreshed.exp).toBeLessThanOrEqual(
            nowSeconds() + DEFAULT_UPLOAD_TOKEN_TTL_SECONDS,
        )
    })

    it('accepts a token whose exp has already passed, as long as it is inside the resume window', async () => {
        const handler = createUpupHandler(config)
        // 2h old: expired for every other route, well inside the 24h window.
        const res = await resume(handler, await mintToken({}, 2 * 3600))

        expect(res.status).toBe(200)
    })

    it('never returns the uploadId — the token stays the only carrier', async () => {
        const handler = createUpupHandler(config)
        const res = await resume(handler, await mintToken())
        const raw = await res.text()

        expect(raw).not.toContain('mp-abc')
        expect((JSON.parse(raw) as ResumeBody).uploadId).toBeUndefined()
    })

    it('ignores a client-sent key and uploadId — the token is authoritative', async () => {
        const handler = createUpupHandler(config)
        const res = await post(handler, '/multipart/resume', {
            token: await mintToken(),
            key: 'attacker/evil.bin',
            uploadId: 'mp-attacker',
        })
        const body = (await res.json()) as ResumeBody

        expect(body.key).toBe('alice/uuid/big.zip')
        expect(listParts).toHaveBeenCalledWith(
            config.storage,
            'alice/uuid/big.zip',
            'mp-abc',
        )
    })

    it('responds through the shared Responder, so the route carries x-upup-request-id like every other', async () => {
        const handler = createUpupHandler(config)
        const res = await resume(handler, await mintToken())

        expect(res.headers.get('x-upup-request-id')).toMatch(/^[0-9a-f-]{36}$/i)
    })

    it('resumes a legacy token minted before iat existed, anchoring the window at exp - TTL', async () => {
        const handler = createUpupHandler(config)
        const issuedAt = nowSeconds() - 600
        const legacy = await signUploadToken(SECRET, {
            k: 'alice/uuid/big.zip',
            u: 'mp-abc',
            uid: null,
            smin: 0,
            smax: 50 * 1024 * 1024,
            exp: issuedAt + DEFAULT_UPLOAD_TOKEN_TTL_SECONDS,
        })
        const res = await resume(handler, legacy)
        const body = (await res.json()) as ResumeBody
        const refreshed = await verifyUploadToken(
            SECRET,
            body.token as string,
            Date.now(),
        )

        expect(res.status).toBe(200)
        // The derived anchor is stamped onto the re-issued token, so the window
        // stays fixed from here on instead of restarting at each resume.
        expect(refreshed.iat).toBe(issuedAt)
    })
})

describe('POST /multipart/resume — token rejection', () => {
    it('rejects a token whose signature does not match with 403 bad_signature', async () => {
        const handler = createUpupHandler(config)
        const foreign = await signUploadToken(
            'a-totally-different-secret-000',
            {
                k: 'alice/uuid/big.zip',
                u: 'mp-abc',
                uid: null,
                smin: 0,
                smax: 100,
                exp: nowSeconds() + 3600,
                iat: nowSeconds(),
            },
        )
        const res = await resume(handler, foreign)
        const body = (await res.json()) as ResumeBody

        expect(res.status).toBe(403)
        expect(body).toEqual({
            error: 'Invalid upload token',
            code: 'bad_signature',
        })
        expect(listParts).not.toHaveBeenCalled()
    })

    it('rejects a token with no separator at all with 403 malformed', async () => {
        const handler = createUpupHandler(config)
        const res = await resume(handler, 'not-a-token-at-all')
        const body = (await res.json()) as ResumeBody

        expect(res.status).toBe(403)
        expect(body).toEqual({
            error: 'Invalid upload token',
            code: 'malformed',
        })
    })

    it('rejects a token older than the resume window with 403 expired', async () => {
        const handler = createUpupHandler(config)
        // 25h old vs the 24h default window.
        const res = await resume(handler, await mintToken({}, 25 * 3600))
        const body = (await res.json()) as ResumeBody

        expect(res.status).toBe(403)
        expect(body.code).toBe('expired')
        expect(listParts).not.toHaveBeenCalled()
    })

    it('honours a custom resume window, rejecting a token older than it', async () => {
        const handler = createUpupHandler({
            ...config,
            multipartResumeWindowSeconds: 3600,
        })
        const res = await resume(handler, await mintToken({}, 3601))
        const body = (await res.json()) as ResumeBody

        expect(res.status).toBe(403)
        expect(body.code).toBe('expired')
    })

    it('clamps the re-issued exp to the resume window, so a short window really is the token lifetime cap', async () => {
        // The whole point of multipartResumeWindowSeconds as a leak mitigation:
        // an operator who shortens it must actually shorten how long a stolen
        // token stays usable. A re-issued token handed a fresh full TTL would
        // outlive the window by up to an hour and make that promise a lie.
        const windowSeconds = 600
        const handler = createUpupHandler({
            ...config,
            multipartResumeWindowSeconds: windowSeconds,
        })
        const agedSeconds = 300 // still inside the 600s window
        const presented = await mintToken({}, agedSeconds)
        const issuedAt = (
            await verifyUploadToken(SECRET, presented, Date.now(), {
                allowExpired: true,
            })
        ).iat as number

        const body = (await (
            await resume(handler, presented)
        ).json()) as ResumeBody
        const refreshed = await verifyUploadToken(
            SECRET,
            body.token as string,
            Date.now(),
        )

        // exp is pinned to the window edge, NOT now + full TTL.
        expect(refreshed.exp).toBe(issuedAt + windowSeconds)
        expect(refreshed.exp).toBeLessThan(
            nowSeconds() + DEFAULT_UPLOAD_TOKEN_TTL_SECONDS,
        )
    })

    it('rejects malformed JSON on the resume route with 400 BAD_REQUEST', async () => {
        const handler = createUpupHandler(config)
        const res = await handler(
            new Request('http://localhost/multipart/resume', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: '{ not json',
            }),
        )
        const body = (await res.json()) as ResumeBody

        expect(res.status).toBe(400)
        expect(body.code).toBe('BAD_REQUEST')
    })
})

describe('POST /multipart/resume — owner binding', () => {
    const identityConfig = {
        ...config,
        allowAnonymousUploads: false,
        getUserId: async (req: Request) => req.headers.get('x-uid'),
    }

    it('rejects a resume by a different authenticated user with 403 AUTH_DENIED', async () => {
        const handler = createUpupHandler(identityConfig)
        const token = await mintToken({ uid: 'alice' })
        const res = await resume(handler, token, { 'x-uid': 'bob' })
        const body = (await res.json()) as ResumeBody

        expect(res.status).toBe(403)
        expect(body.code).toBe('AUTH_DENIED')
        expect(listParts).not.toHaveBeenCalled()
    })

    it('allows a resume by the user the token was issued to', async () => {
        const handler = createUpupHandler(identityConfig)
        const token = await mintToken({ uid: 'alice' })
        const res = await resume(handler, token, { 'x-uid': 'alice' })

        expect(res.status).toBe(200)
    })

    it('keeps the token-possession model when no getUserId resolver is configured', async () => {
        const handler = createUpupHandler(config)
        const res = await resume(handler, await mintToken({ uid: null }))

        expect(res.status).toBe(200)
    })
})

describe('POST /multipart/resume — vanished upload', () => {
    it('maps the provider NoSuchUpload error to 404 NOT_FOUND so the client starts fresh', async () => {
        const gone = Object.assign(new Error('The upload does not exist'), {
            name: 'NoSuchUpload',
        })
        listParts.mockRejectedValue(gone)

        const handler = createUpupHandler(config)
        const res = await resume(handler, await mintToken())
        const body = (await res.json()) as ResumeBody

        expect(res.status).toBe(404)
        expect(body.code).toBe('NOT_FOUND')
    })

    it('still reports an unrelated provider failure as 500, not as a vanished upload', async () => {
        listParts.mockRejectedValue(new Error('connection reset'))

        const handler = createUpupHandler({ ...config, onError: () => {} })
        const res = await resume(handler, await mintToken())
        const body = (await res.json()) as ResumeBody

        expect(res.status).toBe(500)
        expect(body.code).toBe('STORAGE_ERROR')
    })
})

describe('POST /multipart/resume — route knob', () => {
    it('does not route the path at all when multipartResumeWindowSeconds is 0', async () => {
        const handler = createUpupHandler({
            ...config,
            multipartResumeWindowSeconds: 0,
        })
        const res = await resume(handler, await mintToken())
        const body = (await res.json()) as ResumeBody

        expect(res.status).toBe(404)
        expect(body.error).toBe('Not found')
        expect(listParts).not.toHaveBeenCalled()
    })

    it('throws at construct time for a negative resume window', () => {
        expect(() =>
            createUpupHandler({
                ...config,
                multipartResumeWindowSeconds: -1,
            }),
        ).toThrow(/multipartResumeWindowSeconds/)
    })

    it('throws at construct time for a fractional resume window', () => {
        expect(() =>
            createUpupHandler({
                ...config,
                multipartResumeWindowSeconds: 1.5,
            }),
        ).toThrow(/multipartResumeWindowSeconds/)
    })
})

describe('multipart/init token issuance', () => {
    it('stamps iat on the token it signs, anchoring the resume window at init', async () => {
        const handler = createUpupHandler(config)
        const before = nowSeconds()
        const init = (await (
            await post(handler, '/multipart/init', {
                name: 'big.zip',
                size: 50 * 1024 * 1024,
                type: 'application/zip',
            })
        ).json()) as ResumeBody
        const payload = await verifyUploadToken(
            SECRET,
            init.token as string,
            Date.now(),
        )

        expect(payload.iat).toBeGreaterThanOrEqual(before)
        expect(payload.iat).toBeLessThanOrEqual(nowSeconds())
        expect(payload.exp).toBe(
            (payload.iat as number) + DEFAULT_UPLOAD_TOKEN_TTL_SECONDS,
        )
    })
})

describe('expired tokens on the four non-resume routes (unchanged)', () => {
    const expiredToken = () => mintToken({}, 2 * 3600)

    it('still rejects an expired token on sign-part with 403 expired', async () => {
        const handler = createUpupHandler(config)
        const res = await post(handler, '/multipart/sign-part', {
            token: await expiredToken(),
            partNumber: 1,
        })
        const body = (await res.json()) as ResumeBody

        expect(res.status).toBe(403)
        expect(body.code).toBe('expired')
    })

    it('still rejects an expired token on complete with 403 expired', async () => {
        const handler = createUpupHandler(config)
        const res = await post(handler, '/multipart/complete', {
            token: await expiredToken(),
            parts: [{ partNumber: 1, eTag: '"etag-1"' }],
        })
        const body = (await res.json()) as ResumeBody

        expect(res.status).toBe(403)
        expect(body.code).toBe('expired')
    })

    it('still rejects an expired token on abort with 403 expired', async () => {
        const handler = createUpupHandler(config)
        const res = await post(handler, '/multipart/abort', {
            token: await expiredToken(),
        })
        const body = (await res.json()) as ResumeBody

        expect(res.status).toBe(403)
        expect(body.code).toBe('expired')
    })
})
