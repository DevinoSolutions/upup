import {
    PutObjectCommand,
    GetObjectCommand,
    CreateMultipartUploadCommand,
    UploadPartCommand,
    CompleteMultipartUploadCommand,
    AbortMultipartUploadCommand,
    ListPartsCommand,
    HeadBucketCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { UpupStorageError } from '@useupup/core'
import type {
    PresignedUrlResponse,
    MultipartInitResponse,
    MultipartSignPartResponse,
    MultipartCompleteResponse,
    MultipartAbortResponse,
    MultipartListPartsResponse,
    MultipartPart,
} from '@useupup/core'
import type { UpupStorageConfig } from '../config'
import { createS3Client } from './s3-client'

const DEFAULT_EXPIRES_IN = 3600
// Exported: the fallback for `config.downloadUrlExpiresIn` (#343). Every signed
// GET this package hands out resolves through here, so the 3-day policy has one
// definition rather than one per call site.
export const DEFAULT_DOWNLOAD_URL_EXPIRES_IN = 3600 * 24 * 3 // 3 days
// Exported: this is the one canonical home for the 5 MiB S3 part-size floor —
// also the fixed memory-safety cap `transfer.ts` uses for its singlePut/
// multipart routing decision (F-501, F-653).
export const MIN_PART_SIZE = 5 * 1024 * 1024 // 5 MiB
const MAX_PARTS = 10_000

// Exported for its boundary tests: the MAX_PARTS clamp is what keeps a
// >48.8 GiB file from failing at part 10,001, and it must stay covered.
export function computePartSize(
    fileSize: number,
    chunkSizeBytes?: number,
): number {
    let partSize = chunkSizeBytes ?? MIN_PART_SIZE
    if (partSize < MIN_PART_SIZE) partSize = MIN_PART_SIZE
    const minPartSizeForFile = Math.ceil(fileSize / MAX_PARTS)
    if (partSize < minPartSizeForFile) partSize = minPartSizeForFile
    return partSize
}

// Exported: transfer.ts's drive-transfer path uses this same signed-URL
// producer as the direct-presign path below, so the 3-day TTL + signing body
// are single-sourced instead of duplicated (F-653).
export async function generateSignedPublicUrl(
    storage: UpupStorageConfig,
    key: string,
    expiresIn = DEFAULT_DOWNLOAD_URL_EXPIRES_IN,
): Promise<string> {
    const client = createS3Client(storage)
    return getSignedUrl(
        client,
        new GetObjectCommand({ Bucket: storage.bucket, Key: key }),
        { expiresIn },
    )
}

export async function generatePresignedUrl(
    storage: UpupStorageConfig,
    key: string,
    contentType: string,
    contentLength: number,
    expiresIn = DEFAULT_EXPIRES_IN,
    downloadUrlExpiresIn?: number,
): Promise<PresignedUrlResponse> {
    const client = createS3Client(storage)

    const command = new PutObjectCommand({
        Bucket: storage.bucket,
        Key: key,
        ContentType: contentType,
        ContentLength: contentLength,
    })

    const uploadUrl = await getSignedUrl(client, command, {
        expiresIn,
        // Bind content-length into the signature so the PUT body cannot exceed the
        // approved size (S1). Browsers/Node set Content-Length from the body; a
        // larger body changes it and S3 rejects the signature.
        signableHeaders: new Set(['content-type', 'content-length']),
    })

    const downloadUrl = await generateSignedPublicUrl(
        storage,
        key,
        downloadUrlExpiresIn ?? DEFAULT_DOWNLOAD_URL_EXPIRES_IN,
    )

    return {
        key,
        downloadUrl,
        uploadUrl,
        uploadHeaders: {
            'Content-Type': contentType || 'application/octet-stream',
        },
        expiresIn,
    }
}

export async function initiateMultipartUpload(
    storage: UpupStorageConfig,
    key: string,
    contentType: string,
    fileSize: number,
    expiresIn = DEFAULT_EXPIRES_IN,
    chunkSizeBytes?: number,
): Promise<MultipartInitResponse> {
    const client = createS3Client(storage)

    const command = new CreateMultipartUploadCommand({
        Bucket: storage.bucket,
        Key: key,
        ContentType: contentType,
    })

    const response = await client.send(command)

    if (!response.UploadId) {
        throw new UpupStorageError(
            'Failed to initiate multipart upload: no UploadId',
            storage.type,
            'multipart-init',
        )
    }

    const partSize = computePartSize(fileSize, chunkSizeBytes)

    return { key, uploadId: response.UploadId, partSize, expiresIn }
}

export async function generatePresignedPartUrl(
    storage: UpupStorageConfig,
    key: string,
    uploadId: string,
    partNumber: number,
    expiresIn = DEFAULT_EXPIRES_IN,
): Promise<MultipartSignPartResponse> {
    const client = createS3Client(storage)

    const command = new UploadPartCommand({
        Bucket: storage.bucket,
        Key: key,
        UploadId: uploadId,
        PartNumber: partNumber,
    })

    const uploadUrl = await getSignedUrl(client, command, { expiresIn })

    return { uploadUrl, expiresIn }
}

export async function completeMultipartUpload(
    storage: UpupStorageConfig,
    key: string,
    uploadId: string,
    parts: MultipartPart[],
    downloadUrlExpiresIn?: number,
): Promise<MultipartCompleteResponse> {
    const client = createS3Client(storage)

    const command = new CompleteMultipartUploadCommand({
        Bucket: storage.bucket,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: {
            Parts: parts
                .sort((a, b) => a.partNumber - b.partNumber)
                .map(p => ({ PartNumber: p.partNumber, ETag: p.eTag })),
        },
    })

    const result = await client.send(command)
    const downloadUrl = await generateSignedPublicUrl(
        storage,
        key,
        downloadUrlExpiresIn ?? DEFAULT_DOWNLOAD_URL_EXPIRES_IN,
    )

    return {
        key,
        downloadUrl,
        ...(result.ETag !== undefined ? { etag: result.ETag } : {}),
    }
}

export async function abortMultipartUpload(
    storage: UpupStorageConfig,
    key: string,
    uploadId: string,
): Promise<MultipartAbortResponse> {
    const client = createS3Client(storage)

    const command = new AbortMultipartUploadCommand({
        Bucket: storage.bucket,
        Key: key,
        UploadId: uploadId,
    })

    await client.send(command)

    return { ok: true }
}

/**
 * Parts S3/MinIO currently holds for an in-progress multipart upload, each with
 * the byte count actually stored (`size`, straight off ListParts' `Size`). The
 * size is what makes a resume safe rather than hopeful: the client re-derives
 * its own chunk boundaries and refuses to complete unless every stored part
 * lands exactly where its chunking would have put it, so a part written by a
 * different chunk size can never be spliced into the middle of the object.
 */
export async function listMultipartParts(
    storage: UpupStorageConfig,
    key: string,
    uploadId: string,
): Promise<MultipartListPartsResponse> {
    const client = createS3Client(storage)
    const parts: MultipartPart[] = []
    let partNumberMarker: string | undefined

    for (;;) {
        const command = new ListPartsCommand({
            Bucket: storage.bucket,
            Key: key,
            UploadId: uploadId,
            PartNumberMarker: partNumberMarker,
        })

        const response = await client.send(command)

        if (response.Parts) {
            for (const part of response.Parts) {
                if (part.PartNumber != null && part.ETag) {
                    parts.push({
                        partNumber: part.PartNumber,
                        eTag: part.ETag,
                        ...(part.Size !== undefined ? { size: part.Size } : {}),
                    })
                }
            }
        }

        if (!response.IsTruncated) break
        partNumberMarker = String(
            response.Parts?.[response.Parts.length - 1]?.PartNumber,
        )
    }

    return { parts }
}

/**
 * Server-internal only (not part of the shared `@useupup/core` multipart contract):
 * sums the ACTUAL bytes S3 has received for an in-progress multipart upload, by
 * reading `Size` off each part from `ListParts`. Used to enforce the signed size
 * envelope (`smin`/`smax`) at complete-time — the client can assert whatever
 * `size` it likes at init, but the bytes actually stored are authoritative
 * (closes the multipart variant of S1: init small, upload large parts, complete).
 * Paginates on `IsTruncated`, mirroring `listMultipartParts`.
 *
 * Deliberately NOT re-expressed as a sum over `listMultipartParts` now that the
 * latter reports `size`: that function DROPS any part S3 reports without a
 * PartNumber or ETag, and this one must count every byte the provider says it
 * holds. Routing the envelope check through a filtered list would let bytes go
 * unbilled against smax — a security regression, not a tidy-up.
 */
export async function getMultipartUploadedSize(
    storage: UpupStorageConfig,
    key: string,
    uploadId: string,
): Promise<number> {
    const client = createS3Client(storage)
    let total = 0
    let partNumberMarker: string | undefined

    for (;;) {
        const command = new ListPartsCommand({
            Bucket: storage.bucket,
            Key: key,
            UploadId: uploadId,
            PartNumberMarker: partNumberMarker,
        })

        const response = await client.send(command)

        if (response.Parts) {
            for (const part of response.Parts) {
                total += part.Size ?? 0
            }
        }

        if (!response.IsTruncated) break
        partNumberMarker = String(
            response.Parts?.[response.Parts.length - 1]?.PartNumber,
        )
    }

    return total
}

/**
 * Cheap reachability probe for /health: a HeadBucketCommand touches S3/MinIO
 * without listing or transferring any object data. Used by handleHealth,
 * TTL-cached there so a probing client can't hammer the real provider.
 */
export async function checkStorageReachable(
    storage: UpupStorageConfig,
): Promise<{ ok: true } | { ok: false; error: unknown }> {
    try {
        const client = createS3Client(storage)
        await client.send(new HeadBucketCommand({ Bucket: storage.bucket }))
        return { ok: true }
    } catch (error) {
        // upup-catch: reachability probe returns the failure in a Result for the
        // caller (handleHealth) to log/shape — deliberately not thrown here.
        return { ok: false, error }
    }
}
