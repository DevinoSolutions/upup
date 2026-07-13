import {
    PutObjectCommand,
    CreateMultipartUploadCommand,
    UploadPartCommand,
    CompleteMultipartUploadCommand,
    AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3'
import { UpupStorageError, UpupErrorCode } from '@useupup/core'
import type { UpupServerConfig, UploadedFile } from './config'
import { createS3Client } from './providers/s3-client'
import { MIN_PART_SIZE, generateSignedPublicUrl } from './providers/aws'
import {
    reportServerError,
    toSafeError,
    type UpupServerLogger,
} from './observability'

// Hard cap on buffered memory per transfer: files at or under this size are
// singlePut (whole body buffered once); everything else streams through
// bounded MIN_PART_SIZE multipart parts, regardless of file size (F-501).
// This bound is intentionally NOT configurable — memory safety must not be a
// raisable knob (the removed `multipartThreshold` let an integrator reintroduce
// unbounded buffering by raising it).
const SINGLE_PUT_MAX_BYTES = MIN_PART_SIZE

export async function transferDriveFileToS3(opts: {
    stream: ReadableStream<Uint8Array>
    size: number
    fileName: string
    mimeType: string
    storage: UpupServerConfig['storage']
    /** Authoritative cap enforced against the ACTUAL streamed bytes (not the
     *  client/drive-declared size). Exceeding it aborts + rejects (F-743). */
    maxBytes?: number | undefined
    /** Observability sink so a failed compensating abort is reported, not
     *  swallowed (F-744). */
    onError?: UpupServerLogger | undefined
    requestId?: string | undefined
}): Promise<UploadedFile> {
    const key = `${crypto.randomUUID()}-${opts.fileName}`

    if (opts.size > 0 && opts.size <= SINGLE_PUT_MAX_BYTES) {
        return singlePut({ ...opts, key })
    }
    return streamingMultipart({ ...opts, key })
}

async function singlePut(opts: {
    stream: ReadableStream<Uint8Array>
    size: number
    fileName: string
    mimeType: string
    storage: UpupServerConfig['storage']
    key: string
    maxBytes?: number | undefined
}): Promise<UploadedFile> {
    const buffer = await streamToUint8Array(opts.stream)
    // Enforce maxFileSize against the bytes we actually received before writing
    // anything to S3 (F-743): the routing decision used a declared size the
    // server never reconciled with the real payload.
    if (opts.maxBytes !== undefined && buffer.byteLength > opts.maxBytes) {
        throw new UpupStorageError(
            `Drive file exceeds the configured maxFileSize (${buffer.byteLength} > ${opts.maxBytes} bytes)`,
            opts.storage.type,
            'upload',
        )
    }
    const client = createS3Client(opts.storage)
    await client.send(
        new PutObjectCommand({
            Bucket: opts.storage.bucket,
            Key: opts.key,
            ContentType: opts.mimeType,
            Body: buffer,
        }),
    )
    const url = await generateSignedPublicUrl(opts.storage, opts.key)
    return {
        key: opts.key,
        name: opts.fileName,
        size: buffer.byteLength,
        type: opts.mimeType,
        url,
    }
}

async function streamingMultipart(opts: {
    stream: ReadableStream<Uint8Array>
    size: number
    fileName: string
    mimeType: string
    storage: UpupServerConfig['storage']
    key: string
    maxBytes?: number | undefined
    onError?: UpupServerLogger | undefined
    requestId?: string | undefined
}): Promise<UploadedFile> {
    const client = createS3Client(opts.storage)

    const init = await client.send(
        new CreateMultipartUploadCommand({
            Bucket: opts.storage.bucket,
            Key: opts.key,
            ContentType: opts.mimeType,
        }),
    )
    const uploadId = init.UploadId
    if (!uploadId)
        throw new UpupStorageError(
            'Missing UploadId on multipart init',
            opts.storage.type,
            'multipart-init',
        )

    const parts: Array<{ PartNumber: number; ETag: string }> = []
    let totalBytes = 0

    try {
        let partNumber = 1
        for await (const chunk of chunkedStream(opts.stream, MIN_PART_SIZE)) {
            const res = await client.send(
                new UploadPartCommand({
                    Bucket: opts.storage.bucket,
                    Key: opts.key,
                    UploadId: uploadId,
                    PartNumber: partNumber,
                    ContentLength: chunk.byteLength,
                    Body: chunk,
                }),
            )
            if (!res.ETag) {
                throw new UpupStorageError(
                    `Missing ETag for part ${partNumber}`,
                    opts.storage.type,
                    'multipart-sign-part',
                )
            }
            parts.push({ PartNumber: partNumber, ETag: res.ETag })
            totalBytes += chunk.byteLength
            // Enforce the cap against real egress; exceeding it throws into the
            // catch below, which aborts the whole multipart upload so no partial
            // object persists (F-743).
            if (opts.maxBytes !== undefined && totalBytes > opts.maxBytes) {
                throw new UpupStorageError(
                    `Drive file exceeds the configured maxFileSize (${totalBytes} > ${opts.maxBytes} bytes)`,
                    opts.storage.type,
                    'upload',
                )
            }
            partNumber++
        }

        if (parts.length === 0) {
            throw new UpupStorageError(
                'Drive download produced no bytes',
                opts.storage.type,
                'upload',
            )
        }

        await client.send(
            new CompleteMultipartUploadCommand({
                Bucket: opts.storage.bucket,
                Key: opts.key,
                UploadId: uploadId,
                MultipartUpload: { Parts: parts },
            }),
        )
    } catch (err) {
        try {
            await client.send(
                new AbortMultipartUploadCommand({
                    Bucket: opts.storage.bucket,
                    Key: opts.key,
                    UploadId: uploadId,
                }),
            )
        } catch (abortErr) {
            // upup-catch: the transfer already failed AND the compensating abort
            // failed too, leaving an incomplete multipart upload lingering
            // (billable until a lifecycle rule reaps it). REPORT it through the
            // observability seam (F-744) — the old code swallowed it with a bare
            // `.catch(() => {})` — then re-throw the ORIGINAL error below so the
            // route still surfaces the real cause.
            reportServerError(opts.onError, {
                route: 'files/transfer',
                method: 'POST',
                status: 500,
                code: UpupErrorCode.STORAGE_ERROR,
                message: `Failed to abort multipart upload after a transfer error (uploadId=${uploadId}, key=${opts.key})`,
                requestId: opts.requestId,
                error: toSafeError(abortErr),
            })
        }
        throw err
    }

    const url = await generateSignedPublicUrl(opts.storage, opts.key)
    return {
        key: opts.key,
        name: opts.fileName,
        size: totalBytes,
        type: opts.mimeType,
        url,
    }
}

async function streamToUint8Array(
    stream: ReadableStream<Uint8Array>,
): Promise<Uint8Array> {
    const reader = stream.getReader()
    const chunks: Uint8Array[] = []
    let total = 0
    for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        chunks.push(value)
        total += value.byteLength
    }
    const out = new Uint8Array(total)
    let offset = 0
    for (const c of chunks) {
        out.set(c, offset)
        offset += c.byteLength
    }
    return out
}

async function* chunkedStream(
    stream: ReadableStream<Uint8Array>,
    chunkSize: number,
): AsyncGenerator<Uint8Array> {
    const reader = stream.getReader()
    let buffered: Uint8Array[] = []
    let bufferedSize = 0

    const flush = (): Uint8Array => {
        const out = new Uint8Array(bufferedSize)
        let offset = 0
        for (const c of buffered) {
            out.set(c, offset)
            offset += c.byteLength
        }
        buffered = []
        bufferedSize = 0
        return out
    }

    for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        buffered.push(value)
        bufferedSize += value.byteLength
        while (bufferedSize >= chunkSize) {
            const out = new Uint8Array(chunkSize)
            let remaining = chunkSize
            let offset = 0
            while (remaining > 0 && buffered.length > 0) {
                const head = buffered[0]
                if (head === undefined) break
                const take = Math.min(head.byteLength, remaining)
                out.set(head.subarray(0, take), offset)
                offset += take
                remaining -= take
                if (take < head.byteLength) {
                    buffered[0] = head.subarray(take)
                } else {
                    buffered.shift()
                }
            }
            bufferedSize -= chunkSize
            yield out
        }
    }

    if (bufferedSize > 0) yield flush()
}
