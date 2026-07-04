import {
  PutObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from "@aws-sdk/client-s3";
import type { UpupServerConfig, UploadedFile } from "./config";
import { createS3Client } from "./providers/s3-client";
import { MIN_PART_SIZE, generateSignedPublicUrl } from "./providers/aws";

// Hard cap on buffered memory per transfer: files at or under this size are
// singlePut (whole body buffered once); everything else streams through
// bounded MIN_PART_SIZE multipart parts, regardless of file size (F-501).
// This bound is intentionally NOT configurable — memory safety must not be a
// raisable knob (the removed `multipartThreshold` let an integrator reintroduce
// unbounded buffering by raising it).
const SINGLE_PUT_MAX_BYTES = MIN_PART_SIZE;

export async function transferDriveFileToS3(opts: {
  stream: ReadableStream<Uint8Array>;
  size: number;
  fileName: string;
  mimeType: string;
  storage: UpupServerConfig["storage"];
}): Promise<UploadedFile> {
  const key = `${crypto.randomUUID()}-${opts.fileName}`;

  if (opts.size > 0 && opts.size <= SINGLE_PUT_MAX_BYTES) {
    return singlePut({ ...opts, key });
  }
  return streamingMultipart({ ...opts, key });
}

async function singlePut(opts: {
  stream: ReadableStream<Uint8Array>;
  size: number;
  fileName: string;
  mimeType: string;
  storage: UpupServerConfig["storage"];
  key: string;
}): Promise<UploadedFile> {
  const buffer = await streamToUint8Array(opts.stream);
  const client = createS3Client(opts.storage);
  await client.send(
    new PutObjectCommand({
      Bucket: opts.storage.bucket,
      Key: opts.key,
      ContentType: opts.mimeType,
      Body: buffer,
    }),
  );
  const url = await generateSignedPublicUrl(opts.storage, opts.key);
  return {
    key: opts.key,
    name: opts.fileName,
    size: buffer.byteLength,
    type: opts.mimeType,
    url,
  };
}

async function streamingMultipart(opts: {
  stream: ReadableStream<Uint8Array>;
  size: number;
  fileName: string;
  mimeType: string;
  storage: UpupServerConfig["storage"];
  key: string;
}): Promise<UploadedFile> {
  const client = createS3Client(opts.storage);

  const init = await client.send(
    new CreateMultipartUploadCommand({
      Bucket: opts.storage.bucket,
      Key: opts.key,
      ContentType: opts.mimeType,
    }),
  );
  const uploadId = init.UploadId;
  if (!uploadId) throw new Error("Missing UploadId on multipart init");

  const parts: Array<{ PartNumber: number; ETag: string }> = [];
  let totalBytes = 0;

  try {
    let partNumber = 1;
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
      );
      if (!res.ETag) {
        throw new Error(`Missing ETag for part ${partNumber}`);
      }
      parts.push({ PartNumber: partNumber, ETag: res.ETag });
      totalBytes += chunk.byteLength;
      partNumber++;
    }

    if (parts.length === 0) {
      throw new Error("Drive download produced no bytes");
    }

    await client.send(
      new CompleteMultipartUploadCommand({
        Bucket: opts.storage.bucket,
        Key: opts.key,
        UploadId: uploadId,
        MultipartUpload: { Parts: parts },
      }),
    );
  } catch (err) {
    await client
      .send(
        new AbortMultipartUploadCommand({
          Bucket: opts.storage.bucket,
          Key: opts.key,
          UploadId: uploadId,
        }),
      )
      .catch(() => {});
    throw err;
  }

  const url = await generateSignedPublicUrl(opts.storage, opts.key);
  return {
    key: opts.key,
    name: opts.fileName,
    size: totalBytes,
    type: opts.mimeType,
    url,
  };
}

async function streamToUint8Array(
  stream: ReadableStream<Uint8Array>,
): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      total += value.byteLength;
    }
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

async function* chunkedStream(
  stream: ReadableStream<Uint8Array>,
  chunkSize: number,
): AsyncGenerator<Uint8Array> {
  const reader = stream.getReader();
  let buffered: Uint8Array[] = [];
  let bufferedSize = 0;

  const flush = (): Uint8Array => {
    const out = new Uint8Array(bufferedSize);
    let offset = 0;
    for (const c of buffered) {
      out.set(c, offset);
      offset += c.byteLength;
    }
    buffered = [];
    bufferedSize = 0;
    return out;
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (!value) continue;
    buffered.push(value);
    bufferedSize += value.byteLength;
    while (bufferedSize >= chunkSize) {
      const out = new Uint8Array(chunkSize);
      let remaining = chunkSize;
      let offset = 0;
      while (remaining > 0 && buffered.length > 0) {
        const head = buffered[0];
        const take = Math.min(head.byteLength, remaining);
        out.set(head.subarray(0, take), offset);
        offset += take;
        remaining -= take;
        if (take < head.byteLength) {
          buffered[0] = head.subarray(take);
        } else {
          buffered.shift();
        }
      }
      bufferedSize -= chunkSize;
      yield out;
    }
  }

  if (bufferedSize > 0) yield flush();
}
