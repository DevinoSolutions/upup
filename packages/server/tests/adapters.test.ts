import { describe, it, expect, vi } from "vitest";
import { createUpupMiddleware } from "../src/express";
import { createUpupPlugin } from "../src/fastify";
import { createUpupRoutes } from "../src/hono";
import { createUpupNextHandler } from "../src/next";

vi.mock("../src/providers/aws", () => ({
  generatePresignedUrl: vi.fn().mockResolvedValue({
    key: "uuid-test.jpg",
    publicUrl: "https://bucket.s3.us-east-1.amazonaws.com/uuid-test.jpg",
    uploadUrl: "https://bucket.s3.us-east-1.amazonaws.com/uuid-test.jpg?sig",
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
  storage: { type: "aws" as const, bucket: "b", region: "us-east-1" },
  uploadTokenSecret: "adapters-test-secret-0123456789",
  allowAnonymousUploads: true,
};

describe("Next.js adapter", () => {
  it("exposes all four HTTP verbs backed by the same handler", () => {
    const { GET, POST, PUT, DELETE } = createUpupNextHandler(config);
    expect(typeof GET).toBe("function");
    expect(typeof POST).toBe("function");
    expect(typeof PUT).toBe("function");
    expect(typeof DELETE).toBe("function");
    expect(GET).toBe(POST);
  });

  it("routes suffix-matched paths when mounted under a prefix", async () => {
    const { POST } = createUpupNextHandler(config);
    const req = new Request("http://localhost/api/upup/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "a.jpg", size: 1024, type: "image/jpeg" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });
});

describe("Hono adapter", () => {
  it("returns a Request -> Response handler", async () => {
    const handler = createUpupRoutes(config);
    const req = new Request("http://localhost/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "a.jpg", size: 1024, type: "image/jpeg" }),
    });
    const res = await handler(req);
    expect(res.status).toBe(200);
  });
});

describe("Express adapter", () => {
  it("translates Express req/res into Web Fetch handler through the shared node-http-bridge (F-651)", async () => {
    const middleware = createUpupMiddleware(config);
    let capturedStatus = 0;
    const headers: Record<string, string> = {};
    let sentBody: string | Buffer = "";
    const req = {
      protocol: "http",
      get: (_: string) => "localhost",
      originalUrl: "/api/upup/presign",
      method: "POST",
      headers: { "content-type": "application/json" },
      body: { name: "a.jpg", size: 1024, type: "image/jpeg" },
    };
    const res = {
      status(c: number) {
        capturedStatus = c;
        return res;
      },
      setHeader(k: string, v: string) {
        headers[k] = v;
        return res;
      },
      send(b: string | Buffer) {
        sentBody = b;
      },
    };
    await middleware(req, res, () => {});
    expect(capturedStatus).toBe(200);
    // The shared bridge sends a lossless Buffer (F-651), not the pre-fix `.text()`
    // string -- JSON.parse still accepts it (Node coerces via toString()), but the
    // explicit Buffer check proves writeWebResponse is genuinely wired in.
    expect(Buffer.isBuffer(sentBody)).toBe(true);
    expect(JSON.parse(sentBody.toString()).uploadUrl).toBeDefined();
    // content-length must never be forwarded verbatim -- Node recomputes it from
    // the Buffer payload; a stale copied value risks a mismatch.
    expect(Object.keys(headers).map((k) => k.toLowerCase())).not.toContain(
      "content-length",
    );
  });
});

describe("Fastify adapter", () => {
  it("registers a catch-all route and translates reply through the shared node-http-bridge (F-651)", async () => {
    const plugin = createUpupPlugin(config);
    const registered: Array<{ path: string; handler: unknown }> = [];
    const fastify = {
      all: (path: string, handler: unknown) => {
        registered.push({ path, handler });
      },
    };
    await plugin(fastify as never);
    expect(registered).toHaveLength(1);
    expect(registered[0].path).toBe("/upup/*");

    let capturedStatus = 0;
    let sentBody: string | Buffer = "";
    const headers: Record<string, string> = {};
    const request = {
      protocol: "http",
      hostname: "localhost",
      url: "/upup/presign",
      method: "POST",
      headers: { "content-type": "application/json" },
      body: { name: "a.jpg", size: 1024, type: "image/jpeg" },
    };
    const reply = {
      code(c: number) {
        capturedStatus = c;
        return reply;
      },
      header(k: string, v: string) {
        headers[k] = v;
        return reply;
      },
      send(b: string | Buffer) {
        sentBody = b;
        return reply;
      },
    };
    const fastifyHandler = registered[0].handler as (
      req: unknown,
      reply: unknown,
    ) => Promise<void>;
    await fastifyHandler(request, reply);
    expect(capturedStatus).toBe(200);
    expect(Buffer.isBuffer(sentBody)).toBe(true);
    expect(JSON.parse(sentBody.toString()).uploadUrl).toBeDefined();
    expect(Object.keys(headers).map((k) => k.toLowerCase())).not.toContain(
      "content-length",
    );
  });

  it("mounts at a custom path when opts.path is supplied (F-652)", async () => {
    const plugin = createUpupPlugin(config, { path: "/custom/*" });
    const registered: Array<{ path: string; handler: unknown }> = [];
    const fastify = {
      all: (path: string, handler: unknown) => {
        registered.push({ path, handler });
      },
    };
    await plugin(fastify as never);
    expect(registered).toHaveLength(1);
    expect(registered[0].path).toBe("/custom/*");
  });

  it("still mounts at /upup/* when no opts are supplied (default preserved)", async () => {
    const plugin = createUpupPlugin(config);
    const registered: Array<{ path: string; handler: unknown }> = [];
    const fastify = {
      all: (path: string, handler: unknown) => {
        registered.push({ path, handler });
      },
    };
    await plugin(fastify as never);
    expect(registered[0].path).toBe("/upup/*");
  });
});
