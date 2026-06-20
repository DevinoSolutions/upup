// Trust-model exploit harness. Drives the REAL createHandler against a local
// MinIO to prove the server stops trusting the client. Gated on UPUP_E2E_MINIO=1
// (same gate as minio.integration.test.ts). Bring infra up first:
//   pnpm e2e:minio:up   then   pnpm e2e:minio:test
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3'
import { buildS3ClientConfig } from '../../src/providers/s3-client'
import { createHandler } from '../../src/handler'
import type { UpupServerConfig } from '../../src/config'

const RUN = process.env.UPUP_E2E_MINIO === '1'

const storage: UpupServerConfig['storage'] = {
  type: 'aws',
  bucket: process.env.UPUP_E2E_BUCKET ?? 'upup-e2e',
  region: process.env.UPUP_E2E_REGION ?? 'us-east-1',
  endpoint: process.env.UPUP_E2E_ENDPOINT ?? 'http://localhost:9000',
  forcePathStyle: true,
  accessKeyId: process.env.MINIO_ROOT_USER ?? 'upupadmin',
  secretAccessKey: process.env.MINIO_ROOT_PASSWORD ?? 'upupadmin123',
}

const SECRET = 'trust-model-integration-secret-0123456789'
// Cast: uploadTokenSecret/allowAnonymous are added to UpupServerConfig in a
// later task; the cast keeps this file compile-clean against the current type
// and valid afterward. (esbuild/vitest ignore types; this is for tsc.)
const config = { storage, uploadTokenSecret: SECRET, allowAnonymous: true } as UpupServerConfig
const s3 = new S3Client(buildS3ClientConfig(storage))
const createdKeys: string[] = []

const post = (handler: (r: Request) => Promise<Response>, path: string, body: unknown) =>
  handler(
    new Request(`http://localhost${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  )

describe.skipIf(!RUN)('trust model — exploit harness', () => {
  beforeAll(async () => {
    try {
      await s3.send(new ListObjectsV2Command({ Bucket: storage.bucket, MaxKeys: 1 }))
    } catch (err) {
      throw new Error(
        `MinIO unreachable at ${storage.endpoint} (bucket ${storage.bucket}). ` +
          `Run "pnpm e2e:minio:up" first. Underlying: ${(err as Error).message}`,
      )
    }
  })

  // S1: presign approves a small size; an oversized PUT body must be rejected.
  it('S1: rejects a PUT whose body exceeds the presigned content-length', async () => {
    const handler = createHandler(config)
    const declared = 1024
    const res = await post(handler, '/presign', {
      name: 's1-oversized.bin',
      size: declared,
      type: 'application/octet-stream',
    })
    expect(res.status).toBe(200)
    const { key, uploadUrl, uploadHeaders } = await res.json()
    createdKeys.push(key)

    const oversized = new Uint8Array(declared * 4) // 4 KiB body vs 1 KiB signed
    const put = await fetch(uploadUrl, {
      method: 'PUT',
      headers: uploadHeaders,
      body: oversized,
    })
    expect(put.ok).toBe(false) // pre-fix: MinIO accepts (200) -> RED
  }, 30_000)

  // S2: completing a multipart with a forged/absent token must be refused (403).
  it('S2: refuses multipart complete without a valid upload token', async () => {
    const handler = createHandler(config)
    const init = await post(handler, '/multipart/init', {
      name: 's2-victim.bin',
      size: 8 * 1024 * 1024,
      type: 'application/octet-stream',
    })
    const initBody = await init.json()
    if (initBody.key) createdKeys.push(initBody.key)

    // Attacker tries to complete at an arbitrary key using the legacy shape.
    const res = await post(handler, '/multipart/complete', {
      key: 'attacker/evil.bin',
      uploadId: initBody.uploadId ?? 'forged',
      parts: [],
    })
    expect(res.status).toBe(403) // pre-fix: 200/500, not 403 -> RED
  }, 30_000)

  afterAll(async () => {
    if (!createdKeys.length) return
    await s3
      .send(
        new DeleteObjectsCommand({
          Bucket: storage.bucket,
          Delete: { Objects: createdKeys.map((Key) => ({ Key })), Quiet: true },
        }),
      )
      .catch(() => {})
  })
})
