import { describe, it, expect, vi, beforeEach } from "vitest";
import { ScreenCaptureController } from "../src/controllers/screen-capture";

class FakeRecorder {
  mimeType = "video/webm";
  state = "inactive";
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  constructor(public stream: MediaStream) {}
  start() {
    this.state = "recording";
  }
  stop() {
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob(["x"]) });
    this.onstop?.();
  }
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.stubGlobal(
    "MediaRecorder",
    FakeRecorder as unknown as typeof MediaRecorder,
  );
  vi.stubGlobal("URL", {
    ...URL,
    createObjectURL: vi.fn(() => "blob:video"),
    revokeObjectURL: vi.fn(),
  });
});

describe("ScreenCaptureController", () => {
  it("sets error when the user cancels the share dialog", async () => {
    (navigator as any).mediaDevices = {
      getDisplayMedia: vi.fn(async () => {
        throw new Error("denied");
      }),
    };
    const c = new ScreenCaptureController({
      setFiles: vi.fn(async () => {}),
      setActiveSource: vi.fn(),
      invalidate: vi.fn(),
    });
    await c.startRecording();
    expect(c.getSnapshot().error).toBeTruthy();
  });
  it("records and stops", async () => {
    const track = { stop: vi.fn(), onended: null as null | (() => void) };
    (navigator as any).mediaDevices = {
      getDisplayMedia: vi.fn(
        async () =>
          ({
            getTracks: () => [track],
            getVideoTracks: () => [track],
          }) as unknown as MediaStream,
      ),
    };
    const c = new ScreenCaptureController({
      setFiles: vi.fn(async () => {}),
      setActiveSource: vi.fn(),
      invalidate: vi.fn(),
    });
    await c.startRecording();
    expect(c.getSnapshot().recordingState).toBe("recording");
    c.stopRecording();
    expect(c.getSnapshot().recordingState).toBe("recorded");
    c.destroy();
  });
  it("destroyed-guard: a display stream resolving after destroy() is stopped, no timer/invalidate", async () => {
    const track = { stop: vi.fn(), onended: null as null | (() => void) };
    const lateStream = {
      getTracks: () => [track],
      getVideoTracks: () => [track],
    } as unknown as MediaStream;
    let resolveGdm!: (s: MediaStream) => void;
    (navigator as any).mediaDevices = {
      getDisplayMedia: vi.fn(
        () =>
          new Promise<MediaStream>((r) => {
            resolveGdm = r;
          }),
      ),
    };
    const invalidate = vi.fn();
    const c = new ScreenCaptureController({
      setFiles: vi.fn(async () => {}),
      setActiveSource: vi.fn(),
      invalidate,
    });
    const pending = c.startRecording();
    c.destroy();
    const at = invalidate.mock.calls.length;
    resolveGdm(lateStream);
    await pending;
    expect(track.stop).toHaveBeenCalled();
    expect(invalidate.mock.calls.length).toBe(at);
    expect(c.getSnapshot().recordingState).toBe("idle");
  });
});
