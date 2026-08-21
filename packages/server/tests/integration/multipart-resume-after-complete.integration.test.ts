// Ready-to-adopt regression test (drop into packages/server/tests/integration/).
// Gap it closes: the committed suite proves resume-after-ABORT degrades to 404
// NOT_FOUND, but never proves the same for resume-after-COMPLETE — the far more
// common real-world case (user finishes the upload in tab A, tab B reloads and
// tries to resume). Verified green on MinIO :9100 AND LocalStack 4.9.2.
import { describe, it, expect } from 'vitest'
import { createUpupHandler } from '../../src/handler'
import type { UpupServerConfig } from '../../src/config'

const RUN = process.env.UPUP_E2E_MINIO === '1'
const PART_SIZE = 5 * 1024 * 1024

const storage: UpupServerConfig['storage'] = {
    type: 'aws',
    bucket: process.env.UPUP_E2E_BUCKET ?? 'upup-e2e',
    region: process.env.UPUP_E2E_REGION ?? 'us-east-1',
    endpoint: process.env.UPUP_E2E_ENDPOINT ?? 'http://localhost:9100',
    forcePathStyle: true,
    accessKeyId: process.env.MINIO_ROOT_USER ?? 'upupadmin',
    secretAccessKey: process.env.MINIO_ROOT_PASSWORD ?? 'upupadmin123',
}

const config: UpupServerConfig = {
    storage,
    uploadTokenSecret: 'completed-resume-regression-secret-0123456789',
    allowAnonymousUploads: true,
}

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

describe.skipIf(!RUN)(
    'multipart resume — after the upload already completed',
    () => {
        it('reports a COMPLETED upload as gone (404 NOT_FOUND) rather than a retryable 5xx', async () => {
            const handler = createUpupHandler(config)
            const init = (await (
                await post(handler, '/multipart/init', {
                    name: 'completed-then-resumed.bin',
                    size: PART_SIZE,
                    type: 'application/octet-stream',
                })
            ).json()) as { key: string; uploadId: string; token: string }

            const signed = (await (
                await post(handler, '/multipart/sign-part', {
                    token: init.token,
                    partNumber: 1,
                })
            ).json()) as { uploadUrl: string }
            const put = await fetch(signed.uploadUrl, {
                method: 'PUT',
                body: new Uint8Array(PART_SIZE).fill(9),
            })
            expect(put.status).toBe(200)

            const done = await post(handler, '/multipart/complete', {
                token: init.token,
                parts: [
                    { partNumber: 1, eTag: put.headers.get('etag') as string },
                ],
            })
            expect(done.status).toBe(200)

            // The reload arrives AFTER the upload finished. ListParts on a completed
            // uploadId is NoSuchUpload on every S3 implementation — the client must
            // be told the session is gone so it can start fresh, not told to retry.
            const res = await post(handler, '/multipart/resume', {
                token: init.token,
            })
            const body = (await res.json()) as { code?: string }
            expect(res.status).toBe(404)
            expect(body.code).toBe('NOT_FOUND')
        }, 120_000)
    },
)
