import { describe, it, expect, beforeEach } from "vitest";
import { createUploader } from "../src/create-uploader";

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("UrlUploader", () => {
  it("mounts and exposes the instance with the link source", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const up = createUploader(host, { sources: ["link"] });
    await Promise.resolve();
    expect(host.querySelector('[data-testid="upup-root"]')).toBeTruthy();
    up.destroy();
  });

  it("addFiles path builds state (fetch->File covered live in storybook)", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const up = createUploader(host, { sources: ["link"] });
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" });
    await up.addFiles([new File([blob], "x.png", { type: "image/png" })]);
    await Promise.resolve();
    expect(up.getState().files.length).toBe(1);
    up.destroy();
  });
});
