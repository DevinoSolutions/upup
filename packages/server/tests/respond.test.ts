// packages/server/tests/respond.test.ts
//
// Unit-pins the single Responder (F-108): every response mechanism
// (json/html/redirect/noContent/fail) bakes the request's CORS headers + an
// x-upup-request-id into the outgoing Response, so no route can forget them.
import { describe, it, expect, vi } from "vitest";
import { createResponder } from "../src/respond";
import type { UpupServerConfig } from "../src/config";

const config: UpupServerConfig = {
  storage: { type: "aws", bucket: "b", region: "us-east-1" },
  uploadTokenSecret: "respond-test-secret-0123456789abc",
  cors: { allowedOrigins: ["https://app.test"] },
};

function req(): Request {
  return new Request("http://localhost/anything", {
    headers: { Origin: "https://app.test" },
  });
}

describe("createResponder — CORS + request id baked into every response", () => {
  it("json() carries the matched ACAO and an x-upup-request-id", () => {
    const res = createResponder(req(), config);
    const out = res.json({}, 200);
    expect(out.status).toBe(200);
    expect(out.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://app.test",
    );
    expect(out.headers.get("Content-Type")).toBe("application/json");
    const rid = out.headers.get("x-upup-request-id");
    expect(rid).toBeTruthy();
    expect(rid).toMatch(/[0-9a-f-]{8,}/);
  });

  it("redirect() is a 302 with Location AND the ACAO header", () => {
    const res = createResponder(req(), config);
    const out = res.redirect("/x");
    expect(out.status).toBe(302);
    expect(out.headers.get("Location")).toBe("/x");
    expect(out.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://app.test",
    );
  });

  it("html() sets a text/html Content-Type AND the ACAO header", () => {
    const res = createResponder(req(), config);
    const out = res.html("<p>");
    expect(out.headers.get("Content-Type")).toBe(
      "text/html; charset=utf-8",
    );
    expect(out.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://app.test",
    );
  });

  it("noContent() is a 204 carrying the CORS headers", () => {
    const res = createResponder(req(), config);
    const out = res.noContent();
    expect(out.status).toBe(204);
    expect(out.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://app.test",
    );
  });

  it("all responses share the SAME request id within one responder", () => {
    const res = createResponder(req(), config);
    const a = res.json({}).headers.get("x-upup-request-id");
    const b = res.html("<p>").headers.get("x-upup-request-id");
    expect(a).toBe(b);
    expect(a).toBeTruthy();
  });

  it("fail() returns {error,code} at the given status and reports once, redacted", async () => {
    const onError = vi.fn();
    const res = createResponder(req(), { ...config, onError });
    const out = res.fail(
      "r",
      "GET",
      500,
      "STORAGE_ERROR",
      "Internal error",
      new Error("boom-secret-leak"),
    );
    expect(out.status).toBe(500);
    expect(out.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://app.test",
    );
    const body = (await out.json()) as { error: string; code: string };
    // Client sees the GENERIC message + machine code, never the raw cause.
    expect(body).toEqual({ error: "Internal error", code: "STORAGE_ERROR" });

    expect(onError).toHaveBeenCalledTimes(1);
    const event = onError.mock.calls[0][0];
    expect(event.route).toBe("r");
    expect(event.method).toBe("GET");
    expect(event.status).toBe(500);
    expect(event.code).toBe("STORAGE_ERROR");
    // The real cause is carried in the (structured, redactable) error field —
    // never in the client-facing body. A request id is attached to the event.
    expect(event.requestId).toBeTruthy();
    expect(event.error?.message).toBe("boom-secret-leak");
    // The serialized client body must NOT contain the raw cause string.
    expect(JSON.stringify(body)).not.toContain("boom-secret-leak");
  });
});
