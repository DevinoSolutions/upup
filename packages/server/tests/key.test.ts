import { describe, it, expect } from "vitest";
import { sanitizeFilename, defaultKeyStrategy } from "../src/key";

describe("sanitizeFilename", () => {
  it("keeps a normal name", () => {
    expect(sanitizeFilename("photo.png")).toBe("photo.png");
  });
  it("strips path separators and traversal", () => {
    expect(sanitizeFilename("../../etc/passwd")).not.toContain("/");
    expect(sanitizeFilename("../../etc/passwd")).not.toContain("..");
  });
  it("replaces unsafe characters", () => {
    expect(sanitizeFilename("a b?c*d.png")).toBe("a_b_c_d.png");
  });
  it("never returns empty", () => {
    expect(sanitizeFilename("")).toBe("file");
    expect(sanitizeFilename("...")).toBe("file");
  });
  it("bounds length", () => {
    expect(sanitizeFilename("x".repeat(500)).length).toBeLessThanOrEqual(128);
  });
});

describe("defaultKeyStrategy", () => {
  it("namespaces by userId", () => {
    const key = defaultKeyStrategy({
      userId: "alice",
      fileName: "f.bin",
      contentType: "t",
      size: 1,
    });
    expect(key.startsWith("alice/")).toBe(true);
    expect(key.endsWith("/f.bin")).toBe(true);
  });
  it("uses anon when userId is null", () => {
    const key = defaultKeyStrategy({
      userId: null,
      fileName: "f.bin",
      contentType: "t",
      size: 1,
    });
    expect(key.startsWith("anon/")).toBe(true);
  });
  it("produces unique keys for the same inputs", () => {
    const ctx = { userId: "a", fileName: "f.bin", contentType: "t", size: 1 };
    expect(defaultKeyStrategy(ctx)).not.toBe(defaultKeyStrategy(ctx));
  });
});
