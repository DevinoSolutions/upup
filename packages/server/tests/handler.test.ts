import { describe, it, expect, vi } from "vitest";
import { createUpupHandler } from "../src/handler";

vi.mock("../src/providers/aws", () => ({
  generatePresignedUrl: vi.fn().mockResolvedValue({
    key: "uuid-test.jpg",
    publicUrl: "https://test-bucket.s3.us-east-1.amazonaws.com/uuid-test.jpg",
    uploadUrl:
      "https://test-bucket.s3.us-east-1.amazonaws.com/uuid-test.jpg?presigned",
    expiresIn: 3600,
  }),
  initiateMultipartUpload: vi.fn(),
  generatePresignedPartUrl: vi.fn(),
  completeMultipartUpload: vi.fn(),
  abortMultipartUpload: vi.fn(),
  listMultipartParts: vi.fn(),
  getMultipartUploadedSize: vi.fn().mockResolvedValue(0),
}));

const config = {
  storage: {
    type: "aws",
    bucket: "test-bucket",
    region: "us-east-1",
  },
  uploadTokenSecret: "handler-test-secret-0123456789",
  allowAnonymousUploads: true,
};

describe("createUpupHandler", () => {
  it("returns 404 for unknown routes", async () => {
    const handler = createUpupHandler(config);
    const req = new Request("http://localhost/unknown", { method: "GET" });
    const res = await handler(req);
    expect(res.status).toBe(404);
  });

  it("handles presign POST", async () => {
    const handler = createUpupHandler(config);
    const req = new Request("http://localhost/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "test.jpg",
        size: 1024,
        type: "image/jpeg",
      }),
    });
    const res = await handler(req);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.uploadUrl).toBeDefined();
    expect(body.key).toBe("uuid-test.jpg");
  });

  it("rejects oversized files", async () => {
    const handler = createUpupHandler({ ...config, maxFileSize: 500 });
    const req = new Request("http://localhost/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "big.jpg", size: 1024, type: "image/jpeg" }),
    });
    const res = await handler(req);
    expect(res.status).toBe(413);
  });

  it("checks auth when configured", async () => {
    const handler = createUpupHandler({
      ...config,
      auth: async () => false,
    });
    const req = new Request("http://localhost/presign", {
      method: "POST",
      body: JSON.stringify({
        name: "test.jpg",
        size: 1024,
        type: "image/jpeg",
      }),
    });
    const res = await handler(req);
    expect(res.status).toBe(401);
  });
});

const configWithProviders = {
  ...config,
  allowAnonymous: true,
  providers: {
    googleDrive: { clientId: "gd-id", clientSecret: "gd-secret" },
    oneDrive: { clientId: "od-id", clientSecret: "od-secret" },
    dropbox: { appKey: "db-key", appSecret: "db-secret" },
  },
};

// OAuth + file routes now enforce a real tokenStore contract and exchange
// codes for tokens at provider endpoints. Their coverage moved to
// tests/server-mode.test.ts. Keep only the "no providers configured" case
// and the validation surfaces here since they don't depend on tokenStore.
describe("OAuth routes — error surfaces", () => {
  it("returns 400 for unknown provider", async () => {
    const handler = createUpupHandler(configWithProviders);
    const req = new Request("http://localhost/auth/unknown-provider", {
      method: "GET",
    });
    const res = await handler(req);
    expect(res.status).toBe(400);
  });
});

describe("File routes — error surfaces", () => {
  it("returns 400 for unknown provider on list", async () => {
    const handler = createUpupHandler(configWithProviders);
    const req = new Request("http://localhost/files/badprovider", {
      method: "GET",
    });
    const res = await handler(req);
    expect(res.status).toBe(400);
  });
});

// F-657 — storage.type accepted all 21 StorageProvider enum values but the S3
// path (buildS3ClientConfig) is honored by NONE of them; it always builds an
// @aws-sdk/client-s3 client via endpoint/forcePathStyle/credentials/region.
// Azure has no S3-compatible surface and could never function, with zero
// compile- or startup-time signal. createUpupHandler now fails fast for the
// one enum value known to have no S3 surface, reusing its existing
// uploadTokenSecret throw path (one construct-time validation mechanism, not
// two).
describe("createUpupHandler — rejects storage.type with no S3-compatible surface (F-657)", () => {
  it('throws for storage.type: "azure" (no S3-compatible API)', () => {
    expect(() =>
      createUpupHandler({
        ...config,
        storage: { ...config.storage, type: "azure" },
      }),
    ).toThrow(/storage\.type/i);
  });

  it('does NOT throw for the "type" reason when storage.type is "minio"', () => {
    expect(() =>
      createUpupHandler({
        ...config,
        storage: { ...config.storage, type: "minio" },
      }),
    ).not.toThrow();
  });

  it('does NOT throw for the "type" reason when storage.type is "aws"', () => {
    expect(() =>
      createUpupHandler({
        ...config,
        storage: { ...config.storage, type: "aws" },
      }),
    ).not.toThrow();
  });

  it('does NOT throw for the "type" reason when storage.type is omitted', () => {
    const { type: _omit, ...storageWithoutType } = config.storage as Record<
      string,
      unknown
    >;
    expect(() =>
      createUpupHandler({
        ...config,
        storage: storageWithoutType as typeof config.storage,
      }),
    ).not.toThrow();
  });

  it('does NOT throw for the "type" reason when storage.type is a custom S3-compatible provider string', () => {
    expect(() =>
      createUpupHandler({
        ...config,
        storage: { ...config.storage, type: "my-custom-provider" },
      }),
    ).not.toThrow();
  });
});
