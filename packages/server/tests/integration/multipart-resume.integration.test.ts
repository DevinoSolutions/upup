// Cross-reload multipart resume against a REAL MinIO, through the real
// createUpupHandler. Gated on UPUP_E2E_MINIO=1 (same gate as the other
// integration suites). Bring infra up first:
//   pnpm e2e:minio:up   then   pnpm e2e:minio:test
//
// A mocked ListParts can only prove the route's shape. These cases prove the
// thing that actually matters: that an upload interrupted partway through is
// finishable from the parts the provider really kept, and that the object that
// lands is byte-identical to the source — including when the parts already
// stored are a sparse set with a hole in the middle.
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createHash } from 'node:crypto'
import {
    S3Client,
    GetObjectCommand,
    ListObjectsV2Command,
    DeleteObjectsCommand,
    HeadObjectCommand,
    ListPartsCommand,
} from '@aws-sdk/client-s3'
import { buildS3ClientConfig } from '../../src/providers/s3-client'
import { createUpupHandler } from '../../src/handler'
import type { UpupServerConfig, UpupStorageConfig } from '../../src/config'

const RUN = process.env.UPUP_E2E_MINIO === '1'
const PART_SIZE = 5 * 1024 * 1024 // MinIO's non-final part floor

// The precise static shape, not `UpupServerConfig['storage']` — since #337 that
// is a union with the resolver form, which has no `bucket` to read below.
const storage: UpupStorageConfig = {
    type: 'aws',
    bucket: process.env.UPUP_E2E_BUCKET ?? 'upup-e2e',
    region: process.env.UPUP_E2E_REGION ?? 'us-east-1',
    // :9100 is the repo's OWN MinIO (local-dev/.env.minio) — never default to
    // :9000, where a FOREIGN MinIO from another project may listen (F-707).
    // Sanctioned entrypoint: pnpm run e2e:minio:test (dotenv-wrapped).
    endpoint: process.env.UPUP_E2E_ENDPOINT ?? 'http://localhost:9100',
    forcePathStyle: true,
    accessKeyId: process.env.MINIO_ROOT_USER ?? 'upupadmin',
    secretAccessKey: process.env.MINIO_ROOT_PASSWORD ?? 'upupadmin123',
}

const config: UpupServerConfig = {
    storage,
    uploadTokenSecret: 'multipart-resume-integration-secret-0123456789',
    allowAnonymousUploads: true,
}

const s3 = new S3Client(buildS3ClientConfig(storage))
const createdKeys: string[] = []

const post = (
    handler: (r: Request) => Promise<Response>,
    path: string,
    body: unknown,
) =>
    handler(
        new Request(`http://localhost${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        }),
    )

type InitBody = { key: string; uploadId: string; token: string }
type SignedPartBody = { uploadUrl: string }
type ResumeBody = {
    key: string
    token: string
    parts: Array<{ partNumber: number; eTag: string; size?: number }>
}

const sha256 = (buf: Uint8Array) =>
    createHash('sha256').update(buf).digest('hex')

function makeBytes(n: number, seed: number): Uint8Array {
    const a = new Uint8Array(n)
    for (let i = 0; i < n; i++) a[i] = (i * 31 + seed) & 0xff
    return a
}

/** Slice `whole` the way a 5 MiB-chunked client would. */
function chunk(whole: Uint8Array): Uint8Array[] {
    const chunks: Uint8Array[] = []
    for (let offset = 0; offset < whole.byteLength; offset += PART_SIZE) {
        chunks.push(whole.subarray(offset, offset + PART_SIZE))
    }
    return chunks
}

async function getObjectBytes(key: string): Promise<Uint8Array> {
    const res = await s3.send(
        new GetObjectCommand({ Bucket: storage.bucket, Key: key }),
    )
    const arr = await (
        res.Body as unknown as {
            transformToByteArray: () => Promise<Uint8Array>
        }
    ).transformToByteArray()
    return new Uint8Array(arr)
}

/** PUT one part through a freshly signed URL and return its ETag. */
async function putPart(
    handler: (r: Request) => Promise<Response>,
    token: string,
    partNumber: number,
    bytes: Uint8Array,
): Promise<string> {
    const signed = (await (
        await post(handler, '/multipart/sign-part', { token, partNumber })
    ).json()) as SignedPartBody
    const put = await fetch(signed.uploadUrl, { method: 'PUT', body: bytes })
    expect(put.status, `PUT part ${partNumber}`).toBe(200)
    return put.headers.get('etag') as string
}

describe.skipIf(!RUN)('multipart resume — real MinIO', () => {
    beforeAll(async () => {
        try {
            await s3.send(
                new ListObjectsV2Command({
                    Bucket: storage.bucket,
                    MaxKeys: 1,
                }),
            )
        } catch (err) {
            // tsconfig's lib is ES2020, which predates the 2-arg
            // Error(message, { cause }) constructor overload -- attach cause
            // as a property instead of widening the repo's lib target.
            const error = new Error(
                `MinIO unreachable at ${storage.endpoint} (bucket ${storage.bucket}). ` +
                    `Run "pnpm e2e:minio:up" first. Underlying: ${(err as Error).message}`,
            )
            ;(error as Error & { cause?: unknown }).cause = err
            throw error
        }
    })

    afterAll(async () => {
        if (!createdKeys.length) return
        await s3
            .send(
                new DeleteObjectsCommand({
                    Bucket: storage.bucket,
                    Delete: {
                        Objects: createdKeys.map(Key => ({ Key })),
                        Quiet: true,
                    },
                }),
            )
            .catch(() => {})
    })

    it('resumes an upload interrupted after 2 of 4 parts and stores byte-identical content', async () => {
        const handler = createUpupHandler(config)
        const whole = makeBytes(3 * PART_SIZE + 4096, 11) // 4 parts: 5+5+5 MiB + tail
        const chunks = chunk(whole)
        expect(chunks).toHaveLength(4)

        const init = (await (
            await post(handler, '/multipart/init', {
                name: 'resume-happy.bin',
                size: whole.byteLength,
                type: 'application/octet-stream',
            })
        ).json()) as InitBody
        createdKeys.push(init.key)

        // The "before the reload" half: parts 1 and 2 only.
        const uploaded = new Map<number, string>()
        for (const partNumber of [1, 2]) {
            uploaded.set(
                partNumber,
                await putPart(
                    handler,
                    init.token,
                    partNumber,
                    chunks[partNumber - 1] as Uint8Array,
                ),
            )
        }

        // The reload: everything the client kept is the token.
        const resumeRes = await post(handler, '/multipart/resume', {
            token: init.token,
        })
        expect(resumeRes.status).toBe(200)
        const resumed = (await resumeRes.json()) as ResumeBody

        expect(resumed.key).toBe(init.key)
        expect(resumed.parts.map(p => p.partNumber).sort()).toEqual([1, 2])
        // Real sizes from the provider, not an echo of anything the client said.
        expect(resumed.parts.map(p => p.size)).toEqual([PART_SIZE, PART_SIZE])
        for (const part of resumed.parts) {
            expect(part.eTag).toBe(uploaded.get(part.partNumber))
        }

        // Finish the remaining parts with URLs signed by the RE-ISSUED token.
        for (const partNumber of [3, 4]) {
            uploaded.set(
                partNumber,
                await putPart(
                    handler,
                    resumed.token,
                    partNumber,
                    chunks[partNumber - 1] as Uint8Array,
                ),
            )
        }

        const done = await post(handler, '/multipart/complete', {
            token: resumed.token,
            parts: [...uploaded].map(([partNumber, eTag]) => ({
                partNumber,
                eTag,
            })),
        })
        expect(done.status).toBe(200)

        const stored = await getObjectBytes(init.key)
        expect(stored.byteLength).toBe(whole.byteLength)
        expect(sha256(stored)).toBe(sha256(whole))
    }, 120_000)

    it('resumes an upload whose stored parts are a sparse set (1 and 3) and still stores byte-identical content', async () => {
        const handler = createUpupHandler(config)
        const whole = makeBytes(3 * PART_SIZE + 2048, 23)
        const chunks = chunk(whole)

        const init = (await (
            await post(handler, '/multipart/init', {
                name: 'resume-sparse.bin',
                size: whole.byteLength,
                type: 'application/octet-stream',
            })
        ).json()) as InitBody
        createdKeys.push(init.key)

        const uploaded = new Map<number, string>()
        for (const partNumber of [1, 3]) {
            uploaded.set(
                partNumber,
                await putPart(
                    handler,
                    init.token,
                    partNumber,
                    chunks[partNumber - 1] as Uint8Array,
                ),
            )
        }

        const resumed = (await (
            await post(handler, '/multipart/resume', { token: init.token })
        ).json()) as ResumeBody

        // The hole is reported as a hole — part 2 is simply absent, and part 3
        // carries a full part size even though it is the highest one held.
        expect(resumed.parts.map(p => p.partNumber).sort()).toEqual([1, 3])
        expect(resumed.parts.map(p => p.size)).toEqual([PART_SIZE, PART_SIZE])

        for (const partNumber of [2, 4]) {
            uploaded.set(
                partNumber,
                await putPart(
                    handler,
                    resumed.token,
                    partNumber,
                    chunks[partNumber - 1] as Uint8Array,
                ),
            )
        }

        const done = await post(handler, '/multipart/complete', {
            token: resumed.token,
            parts: [...uploaded]
                .map(([partNumber, eTag]) => ({ partNumber, eTag }))
                .sort((a, b) => a.partNumber - b.partNumber),
        })
        expect(done.status).toBe(200)

        const stored = await getObjectBytes(init.key)
        expect(sha256(stored)).toBe(sha256(whole))
    }, 120_000)

    it('keeps enforcing the signed size envelope through a resumed token: complete is refused and the upload torn down', async () => {
        const handler = createUpupHandler(config)
        const declaredSize = 1024 // tiny declared size -> smax = 1024 bytes

        const init = (await (
            await post(handler, '/multipart/init', {
                name: 'resume-envelope.bin',
                size: declaredSize,
                type: 'application/octet-stream',
            })
        ).json()) as InitBody
        createdKeys.push(init.key)

        // Resume before uploading anything: the envelope must survive the
        // re-issue, not be re-derived from whatever is on the wire now.
        const resumed = (await (
            await post(handler, '/multipart/resume', { token: init.token })
        ).json()) as ResumeBody
        expect(resumed.parts).toEqual([])

        const oversized = new Uint8Array(PART_SIZE).fill(3) // 5 MiB >> 1 KiB
        const eTag = await putPart(handler, resumed.token, 1, oversized)

        const done = await post(handler, '/multipart/complete', {
            token: resumed.token,
            parts: [{ partNumber: 1, eTag }],
        })
        expect(done.status).toBe(403)

        // Nothing finalized...
        await expect(
            s3.send(
                new HeadObjectCommand({
                    Bucket: storage.bucket,
                    Key: init.key,
                }),
            ),
        ).rejects.toThrow()

        // ...and the multipart upload itself is gone, not left dangling.
        await expect(
            s3.send(
                new ListPartsCommand({
                    Bucket: storage.bucket,
                    Key: init.key,
                    UploadId: init.uploadId,
                }),
            ),
        ).rejects.toThrow()
    }, 120_000)

    it('refuses to resume an upload that has already been aborted, with 404 rather than a retryable 5xx', async () => {
        const handler = createUpupHandler(config)
        const init = (await (
            await post(handler, '/multipart/init', {
                name: 'resume-vanished.bin',
                size: PART_SIZE,
                type: 'application/octet-stream',
            })
        ).json()) as InitBody
        createdKeys.push(init.key)

        const aborted = await post(handler, '/multipart/abort', {
            token: init.token,
        })
        expect(aborted.status).toBe(200)

        const res = await post(handler, '/multipart/resume', {
            token: init.token,
        })
        const body = (await res.json()) as { code?: string }

        expect(res.status).toBe(404)
        expect(body.code).toBe('NOT_FOUND')
    }, 60_000)
})
