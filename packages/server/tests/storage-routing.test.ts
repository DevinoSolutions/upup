// Issue #337: route each upload to a different bucket per request. `storage`
// accepts a resolver function, `keyStrategy` sees the request and the client's
// metadata, and the multipart continuation routes are pinned to the storage the
// init resolved via a signed identity in the upload token.
//
// Mocks providers/aws so every call records the storage it was handed — the
// assertion is always "which bucket did this route actually reach".
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UpupErrorCode } from '@useupup/core'
import type { UpupStorageConfig } from '../src/config'

const reached: Array<{ op: string; bucket: string }> = []

function record(op: string) {
    return (storage: UpupStorageConfig, ...rest: unknown[]) => {
        reached.push({ op, bucket: storage.bucket })
        return rest
    }
}

vi.mock('../src/providers/aws', () => ({
    generatePresignedUrl: vi.fn((storage: UpupStorageConfig, key: string) => {
        record('presign')(storage)
        return Promise.resolve({
            key,
            uploadUrl: `https://${storage.bucket}/put`,
            downloadUrl: `https://${storage.bucket}/get`,
            expiresIn: 3600,
        })
    }),
    initiateMultipartUpload: vi.fn(
        (storage: UpupStorageConfig, key: string) => {
            record('multipart-init')(storage)
            return Promise.resolve({
                key,
                uploadId: 'mp-1',
                partSize: 5 * 1024 * 1024,
                expiresIn: 3600,
            })
        },
    ),
    generatePresignedPartUrl: vi.fn((storage: UpupStorageConfig) => {
        record('sign-part')(storage)
        return Promise.resolve({
            uploadUrl: `https://${storage.bucket}/part`,
            expiresIn: 3600,
        })
    }),
    completeMultipartUpload: vi.fn(
        (storage: UpupStorageConfig, key: string) => {
            record('complete')(storage)
            return Promise.resolve({
                key,
                downloadUrl: `https://${storage.bucket}/get`,
            })
        },
    ),
    abortMultipartUpload: vi.fn((storage: UpupStorageConfig) => {
        record('abort')(storage)
        return Promise.resolve({ ok: true })
    }),
    listMultipartParts: vi.fn((storage: UpupStorageConfig) => {
        record('resume')(storage)
        return Promise.resolve({ parts: [] })
    }),
    getMultipartUploadedSize: vi.fn(() => Promise.resolve(0)),
    checkStorageReachable: vi.fn(() => Promise.resolve({ ok: true as const })),
    generateSignedPublicUrl: vi.fn(() => Promise.resolve('https://signed')),
    DEFAULT_DOWNLOAD_URL_EXPIRES_IN: 3600 * 24 * 3,
    MIN_PART_SIZE: 5 * 1024 * 1024,
}))

// Drive-transfer path: a stub provider that yields a small known file, and a
// transfer that records only which bucket it was pointed at.
const transferred: string[] = []

vi.mock('../src/drive-clients', () => ({
    getDriveClient: () => ({
        listFiles: () => Promise.resolve([]),
        fetchFile: () =>
            Promise.resolve({
                stream: new Blob(['hello world!']).stream(),
                size: 12,
                fileName: 'from-drive.pdf',
                mimeType: 'application/pdf',
            }),
    }),
}))

vi.mock('../src/transfer', () => ({
    transferDriveFileToS3: (opts: {
        storage: UpupStorageConfig
        fileName: string
        mimeType: string
        size: number
    }) => {
        transferred.push(opts.storage.bucket)
        return Promise.resolve({
            key: `k/${opts.fileName}`,
            name: opts.fileName,
            size: opts.size,
            type: opts.mimeType,
            url: `https://${opts.storage.bucket}/get`,
        })
    },
}))

import { createUpupHandler } from '../src/handler'
import { storageIdentity } from '../src/resolve-storage'
import { signUploadToken } from '../src/uploadToken'
import {
    InMemoryTokenStore,
    setTokens,
    DEFAULT_USER_ID,
} from '../src/tokenStore'
import type { UpupServerConfig, StorageResolverContext } from '../src/config'

const SECRET = 'a-stable-secret-at-least-16'

const BUCKETS: Record<string, UpupStorageConfig> = {
    images: { type: 'aws', bucket: 'app-images', region: 'us-east-1' },
    quarantine: { type: 'aws', bucket: 'app-quarantine', region: 'us-east-1' },
    documents: { type: 'aws', bucket: 'app-documents', region: 'eu-west-1' },
}

/** The issue's real shape: three buckets, chosen from a client-supplied class,
 *  and pinned by storageId on the multipart continuation routes. */
const routeByClass = (ctx: StorageResolverContext): UpupStorageConfig => {
    if (ctx.storageId) {
        const bound = Object.values(BUCKETS).find(
            b => identityOf(b) === ctx.storageId,
        )
        if (bound) return bound
    }
    const cls = String(ctx.metadata?.uploadClass ?? 'documents')
    return BUCKETS[cls] ?? BUCKETS.documents!
}

// Populated in beforeAll-ish fashion below; storageIdentity is async.
const identities = new Map<string, string>()
const identityOf = (s: UpupStorageConfig) => identities.get(s.bucket)

function post(path: string, body: unknown): Request {
    return new Request(`https://app.example.com/api/upup${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
    })
}

const meta = (uploadClass?: string) => ({
    name: 'scan.pdf',
    type: 'application/pdf',
    size: 2048,
    ...(uploadClass ? { metadata: { uploadClass } } : {}),
})

beforeEach(async () => {
    reached.length = 0
    transferred.length = 0
    for (const s of Object.values(BUCKETS)) {
        identities.set(s.bucket, await storageIdentity(s))
    }
})

const dynamic: UpupServerConfig = {
    storage: routeByClass,
    uploadTokenSecret: SECRET,
    allowAnonymousUploads: true,
}

describe('per-request storage routing (#337)', () => {
    it('sends /presign to the bucket the resolver picks from metadata', async () => {
        const handler = createUpupHandler(dynamic)
        await handler(post('/presign', meta('images')))
        await handler(post('/presign', meta('quarantine')))
        await handler(post('/presign', meta()))
        expect(reached.map(r => r.bucket)).toEqual([
            'app-images',
            'app-quarantine',
            'app-documents',
        ])
    })

    it('gives the resolver the request, phase, identity and declared file', async () => {
        const seen: StorageResolverContext[] = []
        const handler = createUpupHandler({
            ...dynamic,
            allowAnonymousUploads: false,
            getUserId: async () => 'user-3',
            storage: ctx => {
                seen.push(ctx)
                return routeByClass(ctx)
            },
        })
        await handler(post('/presign', meta('images')))
        expect(seen).toHaveLength(1)
        expect(seen[0]).toMatchObject({
            phase: 'presign',
            userId: 'user-3',
            metadata: { uploadClass: 'images' },
            fileName: 'scan.pdf',
            contentType: 'application/pdf',
            size: 2048,
        })
        expect(seen[0]?.req).toBeInstanceOf(Request)
    })

    it('routes the drive-transfer path through the resolver too', async () => {
        const seen: StorageResolverContext[] = []
        const tokenStore = new InMemoryTokenStore()
        const config: UpupServerConfig = {
            ...dynamic,
            allowAnonymous: true,
            tokenStore,
            providers: {
                googleDrive: { clientId: 'id', clientSecret: 'secret' },
            },
            storage: ctx => {
                seen.push(ctx)
                return routeByClass(ctx)
            },
        }
        await setTokens(tokenStore, DEFAULT_USER_ID, 'google-drive', {
            accessToken: 'at',
        })
        const handler = createUpupHandler(config)

        const res = await handler(
            post('/files/google-drive/transfer', {
                fileId: 'f1',
                metadata: { uploadClass: 'quarantine' },
            }),
        )

        expect(res.status).toBe(200)
        expect(seen).toHaveLength(1)
        expect(seen[0]).toMatchObject({
            phase: 'drive-transfer',
            metadata: { uploadClass: 'quarantine' },
            // The drive's REAL name/type/size, not the client's claim.
            fileName: 'from-drive.pdf',
            contentType: 'application/pdf',
            size: 12,
        })
        expect(transferred).toEqual(['app-quarantine'])
    })
})

describe('multipart continuations stay bound to the init storage (#337)', () => {
    it('reaches the same bucket on sign-part, complete and abort', async () => {
        const handler = createUpupHandler(dynamic)
        const init = (await (
            await handler(post('/multipart/init', meta('quarantine')))
        ).json()) as { token: string }

        await handler(
            post('/multipart/sign-part', { token: init.token, partNumber: 1 }),
        )
        await handler(
            post('/multipart/complete', { token: init.token, parts: [] }),
        )
        await handler(post('/multipart/abort', { token: init.token }))

        expect(reached.map(r => `${r.op}:${r.bucket}`)).toEqual([
            'multipart-init:app-quarantine',
            'sign-part:app-quarantine',
            'complete:app-quarantine',
            'abort:app-quarantine',
        ])
    })

    it('binds the storage identity into the signed token', async () => {
        const handler = createUpupHandler(dynamic)
        const init = (await (
            await handler(post('/multipart/init', meta('images')))
        ).json()) as { token: string }
        const payload = JSON.parse(
            Buffer.from(init.token.split('.')[0]!, 'base64url').toString(),
        ) as { sid?: string }
        expect(payload.sid).toBe(identityOf(BUCKETS.images!))
    })

    it('403s when a validly-signed token names storage the resolver will not produce', async () => {
        const handler = createUpupHandler({
            ...dynamic,
            // Ignores storageId entirely — the resolved bucket cannot match the
            // token's bound identity, which must be caught, not silently used.
            storage: () => BUCKETS.images!,
        })
        const forged = await signUploadToken(SECRET, {
            k: 'app-quarantine/uuid/scan.pdf',
            u: 'mp-1',
            uid: null,
            smin: 0,
            smax: 2048,
            sid: identityOf(BUCKETS.quarantine!)!,
            exp: Math.floor(Date.now() / 1000) + 600,
        })
        const res = await handler(
            post('/multipart/sign-part', { token: forged, partNumber: 1 }),
        )
        expect(res.status).toBe(403)
        expect((await res.json()) as { code: string }).toMatchObject({
            code: UpupErrorCode.AUTH_DENIED,
        })
        expect(reached).toEqual([])
    })

    // /multipart/resume arrived with cross-reload resume and is a continuation
    // like the other three: it must honour the token's binding, and the token it
    // hands back must carry that binding forward — otherwise one resume launders
    // a bucket-bound token into an unbound one.
    it('reaches the bound bucket on resume and re-issues the same binding', async () => {
        const handler = createUpupHandler(dynamic)
        const init = (await (
            await handler(post('/multipart/init', meta('quarantine')))
        ).json()) as { token: string }

        const resumed = (await (
            await handler(post('/multipart/resume', { token: init.token }))
        ).json()) as { token: string }

        expect(reached.map(r => `${r.op}:${r.bucket}`)).toEqual([
            'multipart-init:app-quarantine',
            'resume:app-quarantine',
        ])

        const payload = JSON.parse(
            Buffer.from(resumed.token.split('.')[0]!, 'base64url').toString(),
        ) as { sid?: string }
        expect(payload.sid).toBe(identityOf(BUCKETS.quarantine!))

        // And the re-issued token still works on a later continuation.
        await handler(
            post('/multipart/sign-part', {
                token: resumed.token,
                partNumber: 1,
            }),
        )
        expect(reached.at(-1)).toEqual({
            op: 'sign-part',
            bucket: 'app-quarantine',
        })
    })

    it('403s a resume whose bound storage the resolver will not produce', async () => {
        const handler = createUpupHandler({
            ...dynamic,
            storage: () => BUCKETS.images!,
        })
        const forged = await signUploadToken(SECRET, {
            k: 'app-quarantine/uuid/scan.pdf',
            u: 'mp-1',
            uid: null,
            smin: 0,
            smax: 2048,
            sid: identityOf(BUCKETS.quarantine!)!,
            exp: Math.floor(Date.now() / 1000) + 600,
        })
        const res = await handler(post('/multipart/resume', { token: forged }))
        expect(res.status).toBe(403)
        expect((await res.json()) as { code: string }).toMatchObject({
            code: UpupErrorCode.AUTH_DENIED,
        })
        expect(reached).toEqual([])
    })

    it('403s a token carrying no storage identity when storage is a resolver', async () => {
        const handler = createUpupHandler(dynamic)
        const legacy = await signUploadToken(SECRET, {
            k: 'k',
            u: 'mp-1',
            uid: null,
            smin: 0,
            smax: 2048,
            exp: Math.floor(Date.now() / 1000) + 600,
        })
        const res = await handler(
            post('/multipart/sign-part', { token: legacy, partNumber: 1 }),
        )
        expect(res.status).toBe(403)
        expect(reached).toEqual([])
    })
})

describe('static storage config is unchanged (#337)', () => {
    const staticConfig: UpupServerConfig = {
        storage: BUCKETS.documents!,
        uploadTokenSecret: SECRET,
        allowAnonymousUploads: true,
    }

    it('still reaches the one configured bucket', async () => {
        const handler = createUpupHandler(staticConfig)
        await handler(post('/presign', meta('images')))
        expect(reached).toEqual([{ op: 'presign', bucket: 'app-documents' }])
    })

    it('issues a token with NO storage identity, and accepts it', async () => {
        const handler = createUpupHandler(staticConfig)
        const init = (await (
            await handler(post('/multipart/init', meta()))
        ).json()) as { token: string }
        const payload = JSON.parse(
            Buffer.from(init.token.split('.')[0]!, 'base64url').toString(),
        ) as Record<string, unknown>
        expect('sid' in payload).toBe(false)

        const res = await handler(
            post('/multipart/sign-part', { token: init.token, partNumber: 1 }),
        )
        expect(res.status).toBe(200)
    })
})

describe('resolver failures are config errors, not silent 200s (#337)', () => {
    it('500s when the resolver returns a provider with no S3 API', async () => {
        const handler = createUpupHandler({
            ...dynamic,
            onError: () => {},
            storage: () => ({ ...BUCKETS.images!, type: 'azure' }),
        })
        const res = await handler(post('/presign', meta()))
        expect(res.status).toBe(500)
        const body = (await res.json()) as { error: string; code: string }
        expect(body.code).toBe(UpupErrorCode.STORAGE_ERROR)
        expect(body.error).toBe('Storage configuration error')
        expect(reached).toEqual([])
    })

    it('500s when the resolver returns a config missing a bucket', async () => {
        const handler = createUpupHandler({
            ...dynamic,
            onError: () => {},
            storage: () => ({ type: 'aws', bucket: '', region: 'us-east-1' }),
        })
        const res = await handler(post('/presign', meta()))
        expect(res.status).toBe(500)
        expect(reached).toEqual([])
    })

    it('does not construct-throw for a resolver, unlike a static azure config', () => {
        expect(() =>
            createUpupHandler({
                storage: () => BUCKETS.images!,
                uploadTokenSecret: SECRET,
                allowAnonymousUploads: true,
            }),
        ).not.toThrow()
        expect(() =>
            createUpupHandler({
                storage: { ...BUCKETS.images!, type: 'azure' },
                uploadTokenSecret: SECRET,
                allowAnonymousUploads: true,
            }),
        ).toThrow(/no S3-compatible API/)
    })
})

describe('keyStrategy sees the request and metadata (#337)', () => {
    it('passes metadata and req alongside the existing fields', async () => {
        const seen: Array<Record<string, unknown>> = []
        const handler = createUpupHandler({
            storage: BUCKETS.images!,
            uploadTokenSecret: SECRET,
            allowAnonymousUploads: true,
            keyStrategy: ctx => {
                seen.push({
                    userId: ctx.userId,
                    fileName: ctx.fileName,
                    contentType: ctx.contentType,
                    size: ctx.size,
                    metadata: ctx.metadata,
                    isRequest: ctx.req instanceof Request,
                })
                return `${String(ctx.metadata?.uploadClass)}/${ctx.fileName}`
            },
        })
        const body = (await (
            await handler(post('/presign', meta('quarantine')))
        ).json()) as { key: string }

        expect(seen).toEqual([
            {
                userId: null,
                fileName: 'scan.pdf',
                contentType: 'application/pdf',
                size: 2048,
                metadata: { uploadClass: 'quarantine' },
                isRequest: true,
            },
        ])
        expect(body.key).toBe('quarantine/scan.pdf')
    })
})
