import { describe, it, expect, vi, beforeEach } from "vitest";
import { FileSource } from "@upup/core";
import { buildUploaderContext } from "../src/context";

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("buildUploaderContext", () => {
  it("builds a context with core, orchestrator, theme and resolved props", () => {
    const onError = vi.fn();
    const { ctx, destroy } = buildUploaderContext(
      { sources: ["local"], maxFiles: 3, allowedFileTypes: "image/*", onError },
      () => {},
    );
    expect(ctx.core).toBeTruthy();
    expect(ctx.orchestrator).toBeTruthy();
    expect(ctx.theme).toBeTruthy();
    expect(ctx.props.limit).toBe(3);
    expect(ctx.props.sources).toContain(FileSource.LOCAL);
    expect(ctx.mode).toBe("client");
    expect(typeof ctx.setActiveSource).toBe("function");
    destroy();
  });

  it("resolves server mode when serverUrl is set without uploadEndpoint", () => {
    const { ctx, destroy } = buildUploaderContext(
      { serverUrl: "http://localhost:53060" },
      () => {},
    );
    expect(ctx.mode).toBe("server");
    expect(ctx.serverUrl).toBe("http://localhost:53060");
    destroy();
  });

  it("wires convenience onFileAdded to the core files-added event", () => {
    const onFileAdded = vi.fn();
    const { ctx, destroy } = buildUploaderContext({ onFileAdded }, () => {});
    ctx.core.emit("files-added", []);
    expect(onFileAdded).toHaveBeenCalled();
    destroy();
  });

  it("routes ctx.setFiles through core.addFiles so files-added fires (autoUpload parity with svelte/react)", async () => {
    const { ctx, destroy } = buildUploaderContext(
      { sources: ["local"] },
      () => {},
    );
    const filesAdded = vi.fn();
    ctx.core.on("files-added", filesAdded);
    await ctx.setFiles([new File(["x"], "a.txt", { type: "text/plain" })]);
    expect(filesAdded).toHaveBeenCalledTimes(1);
    expect(ctx.core.files.size).toBe(1);
    destroy();
  });
});
