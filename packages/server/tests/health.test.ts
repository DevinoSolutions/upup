import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../src/providers/aws", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/providers/aws")>();
  return {
    ...actual,
    checkStorageReachable: vi.fn(),
  };
});

import { handleHealth, _resetStorageCheckCacheForTests } from "../src/health";
import { checkStorageReachable } from "../src/providers/aws";
import type { UpupServerConfig } from "../src/config";

const baseConfig: UpupServerConfig = {
  storage: { type: "aws", bucket: "test-bucket", region: "us-east-1" },
  uploadTokenSecret: "health-test-secret-0123456789ab",
};

describe("handleHealth", () => {
  beforeEach(() => {
    vi.mocked(checkStorageReachable).mockReset();
    _resetStorageCheckCacheForTests();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reports ok/ok when config is complete and storage is reachable", async () => {
    vi.mocked(checkStorageReachable).mockResolvedValue({ ok: true });
    const res = await handleHealth(baseConfig, {});
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.checks.config).toBe("ok");
    expect(body.checks.storage).toBe("ok");
  });

  it("reports config incomplete when the bucket is missing", async () => {
    vi.mocked(checkStorageReachable).mockResolvedValue({ ok: true });
    const incomplete: UpupServerConfig = {
      ...baseConfig,
      storage: { type: "aws", bucket: "", region: "us-east-1" },
    };
    const res = await handleHealth(incomplete, {});
    const body = await res.json();
    expect(body.checks.config).toBe("incomplete");
  });

  it("reports storage error and fires config.onError when the probe throws", async () => {
    const onError = vi.fn();
    vi.mocked(checkStorageReachable).mockResolvedValue({
      ok: false,
      error: new Error("bucket not found"),
    });
    const res = await handleHealth({ ...baseConfig, onError }, {});
    const body = await res.json();
    expect(body.checks.storage).toBe("error");
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("omits the secret fingerprint by default", async () => {
    vi.mocked(checkStorageReachable).mockResolvedValue({ ok: true });
    const res = await handleHealth(baseConfig, {});
    const body = await res.json();
    expect(body.uploadTokenFingerprint).toBeUndefined();
  });

  it("includes the secret fingerprint when opted in", async () => {
    vi.mocked(checkStorageReachable).mockResolvedValue({ ok: true });
    const res = await handleHealth(
      { ...baseConfig, health: { exposeSecretFingerprint: true } },
      {},
    );
    const body = await res.json();
    expect(typeof body.uploadTokenFingerprint).toBe("string");
    expect(body.uploadTokenFingerprint).toHaveLength(8);
  });

  it("caches the storage probe result within the TTL window (does not re-probe every request)", async () => {
    vi.mocked(checkStorageReachable).mockResolvedValue({ ok: true });
    await handleHealth(baseConfig, {});
    await handleHealth(baseConfig, {});
    await handleHealth(baseConfig, {});
    expect(checkStorageReachable).toHaveBeenCalledTimes(1);
  });
});
