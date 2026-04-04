import {
  S3Client,
  type S3ClientConfig,
  PutObjectCommand,
  GetObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  ListPartsCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type {
  PresignedUrlResponse,
  MultipartInitResponse,
  MultipartSignPartResponse,
  MultipartCompleteResponse,
  MultipartAbortResponse,
  MultipartListPartsResponse,
  MultipartPart,
} from '@upup/shared'
import type { UpupServerConfig } from '../config'

const DEFAULT_EXPIRES_IN = 3600
const DEFAULT_PUBLIC_URL_EXPIRES_IN = 3600 * 24 * 3 // 3 days
const MIN_PART_SIZE = 5 * 1024 * 1024 // 5 MiB
const MAX_PARTS = 10_000

function createS3Client(storage: UpupServerConfig['storage']): S3Client {
  const config: S3ClientConfig = { region: storage.region }
  if (storage.accessKeyId && storage.secretAccessKey) {
    config.credentials = {
      accessKeyId: storage.accessKeyId as string,
      secretAccessKey: storage.secretAccessKey as string,
    }
  }
  return new S3Client(config)
}

function computePartSize(fileSize: number, chunkSizeBytes?: number): number {
  let partSize = chunkSizeBytes ?? MIN_PART_SIZE
  if (partSize < MIN_PART_SIZE) partSize = MIN_PART_SIZE
  const minPartSizeForFile = Math.ceil(fileSize / MAX_PARTS)
  if (partSize < minPartSizeForFile) partSize = minPartSizeForFile
  return partSize
}

async function generateSignedPublicUrl(
  storage: UpupServerConfig['storage'],
  key: string,
  expiresIn = DEFAULT_PUBLIC_URL_EXPIRES_IN,
): Promise<string> {
  const client = createS3Client(storage)
  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: storage.bucket, Key: key }),
    { expiresIn },
  )
}

export async function generatePresignedUrl(
  storage: UpupServerConfig['storage'],
  fileName: string,
  contentType: string,
  contentLength: number,
  expiresIn = DEFAULT_EXPIRES_IN,
): Promise<PresignedUrlResponse> {
  const client = createS3Client(storage)
  const key = `${crypto.randomUUID()}-${fileName}`

  const command = new PutObjectCommand({
    Bucket: storage.bucket,
    Key: key,
    ContentType: contentType,
    ContentLength: contentLength,
  })

  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn,
    signableHeaders: new Set(['content-type', 'content-length']),
  })

  const publicUrl = await generateSignedPublicUrl(storage, key)

  return { key, publicUrl, uploadUrl, expiresIn }
}

export async function initiateMultipartUpload(
  storage: UpupServerConfig['storage'],
  fileName: string,
  contentType: string,
  fileSize: number,
  expiresIn = DEFAULT_EXPIRES_IN,
  chunkSizeBytes?: number,
): Promise<MultipartInitResponse> {
  const client = createS3Client(storage)
  const key = `${crypto.randomUUID()}-${fileName}`

  const command = new CreateMultipartUploadCommand({
    Bucket: storage.bucket,
    Key: key,
    ContentType: contentType,
  })

  const response = await client.send(command)

  if (!response.UploadId) {
    throw new Error('Failed to initiate multipart upload: no UploadId')
  }

  const partSize = computePartSize(fileSize, chunkSizeBytes)

  return { key, uploadId: response.UploadId, partSize, expiresIn }
}

export async function generatePresignedPartUrl(
  storage: UpupServerConfig['storage'],
  key: string,
  uploadId: string,
  partNumber: number,
  contentLength: number,
  expiresIn = DEFAULT_EXPIRES_IN,
): Promise<MultipartSignPartResponse> {
  const client = createS3Client(storage)

  const command = new UploadPartCommand({
    Bucket: storage.bucket,
    Key: key,
    UploadId: uploadId,
    PartNumber: partNumber,
    ContentLength: contentLength,
  })

  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn,
    signableHeaders: new Set(['content-length']),
  })

  return { uploadUrl, expiresIn }
}

export async function completeMultipartUpload(
  storage: UpupServerConfig['storage'],
  key: string,
  uploadId: string,
  parts: MultipartPart[],
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
  const publicUrl = await generateSignedPublicUrl(storage, key)

  return { key, publicUrl, etag: result.ETag }
}

export async function abortMultipartUpload(
  storage: UpupServerConfig['storage'],
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

export async function listMultipartParts(
  storage: UpupServerConfig['storage'],
  key: string,
  uploadId: string,
): Promise<MultipartListPartsResponse> {
  const client = createS3Client(storage)
  const parts: MultipartPart[] = []
  let partNumberMarker: string | undefined

  while (true) {
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
          parts.push({ partNumber: part.PartNumber, eTag: part.ETag })
        }
      }
    }

    if (!response.IsTruncated) break
    partNumberMarker = String(response.Parts?.[response.Parts.length - 1]?.PartNumber)
  }

  return { parts }
}
