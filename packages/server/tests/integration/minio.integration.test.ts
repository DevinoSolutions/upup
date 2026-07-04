// Real-bytes upload validation against a local MinIO (S3-compatible) bucket.
// Gated on UPUP_E2E_MINIO=1 so normal/pre-commit `vitest run` stays green
// (the suite is skipped when the flag is unset). Bring MinIO up first:
//   pnpm e2e:minio:up   then   pnpm e2e:minio:test
//
// Covers the three real storage code paths:
//   A. presign + direct PUT       (generatePresignedUrl)
//   B. multipart                  (initiate -> sign-part -> PUT -> complete)
//   C. server-mode drive transfer (transferDriveFileToS3, stubbed stream)
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createHash } from "node:crypto";
import {
  S3Client,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { buildS3ClientConfig } from "../../src/providers/s3-client";
import {
  generatePresignedUrl,
  initiateMultipartUpload,
  generatePresignedPartUrl,
  completeMultipartUpload,
} from "../../src/providers/aws";
import { transferDriveFileToS3 } from "../../src/transfer";
import type { UpupServerConfig } from "../../src/config";

const RUN = process.env.UPUP_E2E_MINIO === "1";

const storage: UpupServerConfig["storage"] = {
  type: "aws",
  bucket: process.env.UPUP_E2E_BUCKET ?? "upup-e2e",
  region: process.env.UPUP_E2E_REGION ?? "us-east-1",
  endpoint: process.env.UPUP_E2E_ENDPOINT ?? "http://localhost:9000",
  forcePathStyle: true,
  accessKeyId: process.env.MINIO_ROOT_USER ?? "upupadmin",
  secretAccessKey: process.env.MINIO_ROOT_PASSWORD ?? "upupadmin123",
};

const client = new S3Client(buildS3ClientConfig(storage));
const uploadedKeys: string[] = [];
const sha256 = (buf: Uint8Array) =>
  createHash("sha256").update(buf).digest("hex");

function makeBytes(n: number, seed = 7): Uint8Array {
  const a = new Uint8Array(n);
  for (let i = 0; i < n; i++) a[i] = (i * 31 + seed) & 0xff;
  return a;
}

async function getObjectBytes(key: string): Promise<Uint8Array> {
  const res = await client.send(
    new GetObjectCommand({ Bucket: storage.bucket, Key: key }),
  );
  const arr = await (
    res.Body as unknown as { transformToByteArray: () => Promise<Uint8Array> }
  ).transformToByteArray();
  return new Uint8Array(arr);
}

describe.skipIf(!RUN)("MinIO real-storage upload validation", () => {
  beforeAll(async () => {
    // Fail loudly (don't silently skip) when the flag is set but MinIO is down —
    // this suite is the milestone gate whenever UPUP_E2E_MINIO=1.
    try {
      await client.send(
        new ListObjectsV2Command({ Bucket: storage.bucket, MaxKeys: 1 }),
      );
    } catch (err) {
      throw new Error(
        `MinIO unreachable at ${storage.endpoint} (bucket ${storage.bucket}). ` +
          `Run "pnpm e2e:minio:up" first. Underlying: ${(err as Error).message}`,
      );
    }
  });

  afterAll(async () => {
    if (uploadedKeys.length === 0) return;
    await client
      .send(
        new DeleteObjectsCommand({
          Bucket: storage.bucket,
          Delete: {
            Objects: uploadedKeys.map((Key) => ({ Key })),
            Quiet: true,
          },
        }),
      )
      .catch(() => {});
  });

  it("Path A: presign + direct PUT stores matching bytes", async () => {
    const bytes = makeBytes(2048, 1);
    const key = `e2e/path-a-${crypto.randomUUID()}.bin`;
    const { uploadUrl, uploadHeaders } = await generatePresignedUrl(
      storage,
      key,
      "application/octet-stream",
      bytes.byteLength,
    );
    uploadedKeys.push(key);
    const put = await fetch(uploadUrl, {
      method: "PUT",
      headers: uploadHeaders,
      body: bytes,
    });
    expect(put.status).toBe(200);

    const stored = await getObjectBytes(key);
    expect(stored.byteLength).toBe(bytes.byteLength);
    expect(sha256(stored)).toBe(sha256(bytes));
  }, 30_000);

  it("Path B: multipart upload stores matching bytes", async () => {
    const part1 = makeBytes(5 * 1024 * 1024, 2); // 5 MiB (min part size)
    const part2 = makeBytes(4096, 3);
    const whole = new Uint8Array(part1.byteLength + part2.byteLength);
    whole.set(part1, 0);
    whole.set(part2, part1.byteLength);

    const key = `e2e/path-b-${crypto.randomUUID()}.bin`;
    const { uploadId } = await initiateMultipartUpload(
      storage,
      key,
      "application/octet-stream",
      whole.byteLength,
    );
    uploadedKeys.push(key);

    const parts: { partNumber: number; eTag: string }[] = [];
    let partNumber = 1;
    for (const chunk of [part1, part2]) {
      const { uploadUrl } = await generatePresignedPartUrl(
        storage,
        key,
        uploadId,
        partNumber,
      );
      const res = await fetch(uploadUrl, { method: "PUT", body: chunk });
      expect(res.status).toBe(200);
      const eTag = res.headers.get("etag");
      expect(eTag, `part ${partNumber} ETag`).toBeTruthy();
      parts.push({ partNumber, eTag: eTag as string });
      partNumber++;
    }

    await completeMultipartUpload(storage, key, uploadId, parts);

    const stored = await getObjectBytes(key);
    expect(stored.byteLength).toBe(whole.byteLength);
    expect(sha256(stored)).toBe(sha256(whole));
  }, 30_000);

  it("Path C (single PUT): drive->S3 transfer stores matching bytes", async () => {
    const bytes = makeBytes(2048, 4); // well under the fixed 5 MB single-PUT cap
    const result = await transferDriveFileToS3({
      stream: new Response(bytes).body as ReadableStream<Uint8Array>,
      size: bytes.byteLength,
      fileName: "path-c-single.bin",
      mimeType: "application/octet-stream",
      storage,
    });
    uploadedKeys.push(result.key);
    expect(result.size).toBe(bytes.byteLength);

    const stored = await getObjectBytes(result.key);
    expect(stored.byteLength).toBe(bytes.byteLength);
    expect(sha256(stored)).toBe(sha256(bytes));
  }, 30_000);

  it("Path C (streaming multipart): drive->S3 transfer stores matching bytes", async () => {
    const bytes = makeBytes(6 * 1024 * 1024, 5); // 6 MiB — over the fixed 5 MB single-PUT cap
    const result = await transferDriveFileToS3({
      stream: new Response(bytes).body as ReadableStream<Uint8Array>,
      size: bytes.byteLength,
      fileName: "path-c-multipart.bin",
      mimeType: "application/octet-stream",
      storage,
    });
    uploadedKeys.push(result.key);
    expect(result.size).toBe(bytes.byteLength);

    const stored = await getObjectBytes(result.key);
    expect(stored.byteLength).toBe(bytes.byteLength);
    expect(sha256(stored)).toBe(sha256(bytes));
  }, 30_000);
});
