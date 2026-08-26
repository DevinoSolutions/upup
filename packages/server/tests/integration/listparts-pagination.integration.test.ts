// Gap this closes: listMultipartParts() / getMultipartUploadedSize() both loop on
// IsTruncated + PartNumberMarker, but MinIO NEVER truncates ListParts (it
// answers MaxParts=10000, IsTruncated=false even at 1001 parts), so on MinIO
// that loop always runs exactly once and the pagination branch is dead code.
// Real AWS S3 caps a ListParts page at 1000 parts — and so does LocalStack.
// Measured 2026-08-15:
//   MinIO      :9100  -> RAW page: parts=1001 IsTruncated=false MaxParts=10000
//   LocalStack 4.9.2  -> RAW page: parts=1000 IsTruncated=true  MaxParts=1000
// Both then yielded 1001 via the helper, i.e. the loop is correct — but only the
// LocalStack run actually executed it.
//
// A 10 GiB upload at the client's 5 MiB part size is 2048 parts, so >1000 parts
// is a routine production shape, not an edge case.
//
// The 5 MiB non-final-part floor is enforced only at CompleteMultipartUpload,
// never at UploadPart — which is why 1001 one-byte parts is a legal way to reach
// the page boundary cheaply (~4s on LocalStack, ~10s on MinIO).
import { describe, it, expect } from 'vitest'
import {
    S3Client,
    CreateMultipartUploadCommand,
    UploadPartCommand,
    AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3'
import { buildS3ClientConfig } from '../../src/providers/s3-client'
import {
    listMultipartParts,
    getMultipartUploadedSize,
} from '../../src/providers/aws'
import type { UpupServerConfig } from '../../src/config'

const RUN = process.env.UPUP_E2E_MINIO === '1'
const N = 1001 // one past S3's 1000-part ListParts page cap

const storage: UpupServerConfig['storage'] = {
    type: 'aws',
    bucket: process.env.UPUP_E2E_BUCKET ?? 'upup-e2e',
    region: process.env.UPUP_E2E_REGION ?? 'us-east-1',
    endpoint: process.env.UPUP_E2E_ENDPOINT ?? 'http://localhost:9100',
    forcePathStyle: true,
    accessKeyId: process.env.MINIO_ROOT_USER ?? 'upupadmin',
    secretAccessKey: process.env.MINIO_ROOT_PASSWORD ?? 'upupadmin123',
}

const s3 = new S3Client(buildS3ClientConfig(storage))

describe.skipIf(!RUN)(
    'ListParts pagination past the 1000-part page cap',
    () => {
        it(`reports every one of ${N} stored parts, and their total size, across page boundaries`, async () => {
            const key = `pagination/${Date.now()}.bin`
            const { UploadId } = await s3.send(
                new CreateMultipartUploadCommand({
                    Bucket: storage.bucket,
                    Key: key,
                }),
            )
            const uploadId = UploadId as string

            try {
                const numbers = Array.from({ length: N }, (_, i) => i + 1)
                const CONCURRENCY = 32
                for (let i = 0; i < numbers.length; i += CONCURRENCY) {
                    await Promise.all(
                        numbers.slice(i, i + CONCURRENCY).map(n =>
                            s3.send(
                                new UploadPartCommand({
                                    Bucket: storage.bucket,
                                    Key: key,
                                    UploadId: uploadId,
                                    PartNumber: n,
                                    Body: new Uint8Array(1).fill(1),
                                }),
                            ),
                        ),
                    )
                }

                const listed = await listMultipartParts(storage, key, uploadId)
                expect(listed.parts).toHaveLength(N)
                expect(
                    listed.parts.map(p => p.partNumber).sort((a, b) => a - b),
                ).toEqual(numbers)

                // The size envelope must count bytes past the page boundary too —
                // undercounting here is an smax bypass, not a display bug.
                expect(
                    await getMultipartUploadedSize(storage, key, uploadId),
                ).toBe(N)
            } finally {
                await s3
                    .send(
                        new AbortMultipartUploadCommand({
                            Bucket: storage.bucket,
                            Key: key,
                            UploadId: uploadId,
                        }),
                    )
                    .catch(() => {})
            }
        }, 600_000)
    },
)
