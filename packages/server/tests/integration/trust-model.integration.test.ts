// Trust-model exploit harness. Drives the REAL createUpupHandler against a local
// MinIO to prove the server stops trusting the client. Gated on UPUP_E2E_MINIO=1
// (same gate as minio.integration.test.ts). Bring infra up first:
//   pnpm e2e:minio:up   then   pnpm e2e:minio:test
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
    S3Client,
    ListObjectsV2Command,
    DeleteObjectsCommand,
    HeadObjectCommand,
    ListPartsCommand,
} from '@aws-sdk/client-s3'
import { buildS3ClientConfig } from '../../src/providers/s3-client'
import { createUpupHandler } from '../../src/handler'
import type { UpupServerConfig } from '../../src/config'

const RUN = process.env.UPUP_E2E_MINIO === '1'

const storage: UpupServerConfig['storage'] = {
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

const SECRET = 'trust-model-integration-secret-0123456789'
// Cast: uploadTokenSecret/allowAnonymous are added to UpupServerConfig in a
// later task; the cast keeps this file compile-clean against the current type
// and valid afterward. (esbuild/vitest ignore types; this is for tsc.)
const config = {
    storage,
    uploadTokenSecret: SECRET,
    allowAnonymous: true,
    allowAnonymousUploads: true,
} as UpupServerConfig
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

// Shapes of the JSON bodies this exploit harness reads back from the real
// handler's presign / multipart routes (see src/upload-routes.ts).
type PresignBody = {
    key: string
    uploadUrl: string
    uploadHeaders: Record<string, string>
}
type MultipartInitBody = { key: string; uploadId: string; token: string }
type SignedPartBody = { uploadUrl: string }

describe.skipIf(!RUN)('trust model — exploit harness', () => {
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

    // S1: presign approves a small size; an oversized PUT body must be rejected.
    it('S1: rejects a PUT whose body exceeds the presigned content-length', async () => {
        const handler = createUpupHandler(config)
        const declared = 1024
        const res = await post(handler, '/presign', {
            name: 's1-oversized.bin',
            size: declared,
            type: 'application/octet-stream',
        })
        expect(res.status).toBe(200)
        const { key, uploadUrl, uploadHeaders } =
            (await res.json()) as PresignBody
        createdKeys.push(key)

        const oversized = new Uint8Array(declared * 4) // 4 KiB body vs 1 KiB signed
        const put = await fetch(uploadUrl, {
            method: 'PUT',
            headers: uploadHeaders,
            body: oversized,
        })
        expect(put.ok).toBe(false) // pre-fix: MinIO accepts (200) -> RED
    }, 30_000)

    // S1 (multipart): the size envelope (smin/smax) is signed into the token at
    // init but was never ENFORCED at complete — a client could init with a tiny
    // declared size (=> tiny smax) then upload real oversized parts and still
    // complete. MinIO requires >=5 MiB for a non-final part, so declare a size
    // well under that and upload one real 5 MiB part.
    it('S1 (multipart): rejects complete when uploaded bytes exceed the signed smax', async () => {
        const handler = createUpupHandler(config)
        const declaredSize = 1024 // tiny declared size -> smax = 1024 bytes
        const init = (await (
            await post(handler, '/multipart/init', {
                name: 's1-multipart-oversized.bin',
                size: declaredSize,
                type: 'application/octet-stream',
            })
        ).json()) as MultipartInitBody
        createdKeys.push(init.key)
        expect(typeof init.token).toBe('string')

        // Upload ONE real part far larger than the declared/signed size.
        const oversizedPart = new Uint8Array(5 * 1024 * 1024).fill(3) // 5 MiB >> 1 KiB declared
        const signed = (await (
            await post(handler, '/multipart/sign-part', {
                token: init.token,
                partNumber: 1,
            })
        ).json()) as SignedPartBody
        const put = await fetch(signed.uploadUrl, {
            method: 'PUT',
            body: oversizedPart,
        })
        expect(put.status).toBe(200)
        const eTag = put.headers.get('etag') as string

        const done = await post(handler, '/multipart/complete', {
            token: init.token,
            parts: [{ partNumber: 1, eTag }],
        })
        expect(done.status).toBe(403) // pre-fix: MinIO completes it (200) -> RED

        // The object must NOT be finalized.
        await expect(
            s3.send(
                new HeadObjectCommand({
                    Bucket: storage.bucket,
                    Key: init.key,
                }),
            ),
        ).rejects.toThrow()

        // ...and the multipart upload itself must be ABORTED (not just left
        // dangling) — ListParts on a dead uploadId is rejected by S3/MinIO.
        await expect(
            s3.send(
                new ListPartsCommand({
                    Bucket: storage.bucket,
                    Key: init.key,
                    UploadId: init.uploadId,
                }),
            ),
        ).rejects.toThrow()
    }, 30_000)

    // S2: a tampered token must be refused; a valid token must succeed.
    it('S2: refuses multipart complete with a forged token (403)', async () => {
        const handler = createUpupHandler(config)
        const res = await post(handler, '/multipart/complete', {
            token: 'forged.token',
            parts: [],
        })
        expect(res.status).toBe(403)
    }, 30_000)

    it('multipart round-trip via the handler stores correct bytes', async () => {
        const handler = createUpupHandler(config)
        const part1 = new Uint8Array(5 * 1024 * 1024).fill(7) // 5 MiB
        const part2 = new Uint8Array(4096).fill(9)

        const init = (await (
            await post(handler, '/multipart/init', {
                name: 'mp-roundtrip.bin',
                size: part1.byteLength + part2.byteLength,
                type: 'application/octet-stream',
            })
        ).json()) as MultipartInitBody
        createdKeys.push(init.key)
        expect(typeof init.token).toBe('string')

        const parts: { partNumber: number; eTag: string }[] = []
        let n = 1
        for (const chunk of [part1, part2]) {
            const signed = (await (
                await post(handler, '/multipart/sign-part', {
                    token: init.token,
                    partNumber: n,
                })
            ).json()) as SignedPartBody
            const put = await fetch(signed.uploadUrl, {
                method: 'PUT',
                body: chunk,
            })
            expect(put.status).toBe(200)
            parts.push({
                partNumber: n,
                eTag: put.headers.get('etag') as string,
            })
            n++
        }

        const done = await post(handler, '/multipart/complete', {
            token: init.token,
            parts,
        })
        expect(done.status).toBe(200)
    }, 60_000)

    it('ignores a client-sent key — the token is authoritative', async () => {
        const handler = createUpupHandler(config)
        const init = (await (
            await post(handler, '/multipart/init', {
                name: 'authoritative.bin',
                size: 8 * 1024 * 1024,
                type: 'application/octet-stream',
            })
        ).json()) as MultipartInitBody
        createdKeys.push(init.key)

        // Sign a part with the real token but ALSO send an attacker key in the body.
        const signed = await post(handler, '/multipart/sign-part', {
            token: init.token,
            key: 'attacker/evil.bin',
            partNumber: 1,
        })
        expect(signed.status).toBe(200)
        const { uploadUrl } = (await signed.json()) as SignedPartBody
        // The presigned part URL must target the token's key, not the attacker key.
        expect(decodeURIComponent(uploadUrl)).toContain(init.key)
        expect(decodeURIComponent(uploadUrl)).not.toContain('attacker/evil.bin')
    }, 30_000)

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
})
