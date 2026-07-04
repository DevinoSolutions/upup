import { describe, it, expect, vi } from "vitest";

const received: { req?: Request } = {};
vi.mock("../src/handler", () => ({
  createUpupHandler: () => async (req: Request) => {
    received.req = req;
    return new Response("{}", { status: 200 });
  },
}));

import { createUpupNextHandler } from "../src/next";

describe("createUpupNextHandler", () => {
  it("returns GET/POST/PUT/DELETE handlers", () => {
    const h = createUpupNextHandler({} as never);
    expect(typeof h.GET).toBe("function");
    expect(typeof h.POST).toBe("function");
    expect(typeof h.PUT).toBe("function");
    expect(typeof h.DELETE).toBe("function");
  });

  it("normalizes the request origin before delegating (baseUrl)", async () => {
    const h = createUpupNextHandler({} as never, {
      baseUrl: "https://app.example.com",
    });
    await h.POST(new Request("https://internal.local/api/upup/presign"));
    expect(new URL(received.req!.url).origin).toBe("https://app.example.com");
  });

  it("passes the request through untouched without opts", async () => {
    const h = createUpupNextHandler({} as never);
    const req = new Request("https://app.example.com/api/upup/presign");
    await h.GET(req);
    expect(received.req).toBe(req);
  });
});
