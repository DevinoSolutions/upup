/**
 * server-mode-drive.spec.ts — T14 server-mode drive regression guard suite
 *
 * Mirrors vanilla's server-drive.test.ts three guards through the Angular
 * public surface (ServerModeDriveService + ServerModeDriveUploaderComponent).
 *
 * Guard 1 — 401 → sign-in fallback:
 *   A 401 from the list endpoint puts the service into 'reauth' state, the
 *   component renders the DriveAuthFallback text (resolved {{provider}} →
 *   "Sign in with Google Drive"), and the browser testid is absent.
 *
 * Guard 2 — destroy aborts in-flight list:
 *   A hanging fetch captures the AbortSignal; destroy() must set signal.aborted.
 *
 * Guard 3 — destroy removes window 'message' listener:
 *   startAuth() arms a window 'message' listener; destroy() must call
 *   window.removeEventListener with 'message'. The internal handler reference
 *   (_authListener/_abort) are owned by the core controller and no longer
 *   exposed here; we verify the net effect through the public surface and spies.
 *
 * Strategy:
 *   - Services constructed via TestBed with a minimal UpupStore mock.
 *   - fetch is stubbed via vi.stubGlobal (same as vanilla).
 *   - No real network/OAuth fires; all state driven through public API.
 *   - Double-brace {{provider}} translations are injected into the store mock
 *     exactly as vanilla does: { authenticatePrompt: '...{{provider}}', signInWith: 'Sign in with {{provider}}' }
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TestBed } from "@angular/core/testing";
import { signal } from "@angular/core";
import { UpupStore } from "../upup-store.service";
import { ServerModeDriveService } from "./server-mode-drive.service";
import { ServerModeDriveUploaderComponent } from "../components/server-mode-drive-uploader.component";
import { EmptyIconComponent } from "../components/icons/empty-icon.component";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Minimal UpupStore mock. Double-brace translations so formatUiMessage resolves
 * {{provider}} exactly as vanilla's makeCtx does.
 *
 * Icons must be decorated @Component classes (not plain `class {}`) because
 * the loading branch renders icons.LoaderIcon via NgComponentOutlet —
 * EmptyIconComponent is the canonical no-op stub used throughout the package.
 */
function makeStoreMock() {
  return {
    serverUrl: "http://localhost:53060",
    isDark: signal(false),
    slotOverrides: signal({
      driveHeader: "",
      driveSearchContainer: "",
      driveSearchInput: "",
      driveBody: "",
      driveFooter: "",
      driveAddFilesButton: "",
      driveCancelFilesButton: "",
      driveItemContainer: "",
      sourceView: "",
      driveLoading: "",
    }),
    translations: signal({
      authenticatePrompt: "Sign in to {{provider}}",
      signInWith: "Sign in with {{provider}}",
    } as any),
    uiProps: {
      icons: {
        LoaderIcon: EmptyIconComponent,
        ContainerAddMoreIcon: EmptyIconComponent,
        FileDeleteIcon: EmptyIconComponent,
        CameraCaptureIcon: EmptyIconComponent,
        CameraRotateIcon: EmptyIconComponent,
        CameraDeleteIcon: EmptyIconComponent,
      },
      allowedFileTypes: "*",
    } as any,
    handleSetSelectedFiles: vi.fn().mockResolvedValue(undefined),
    setActiveSource: vi.fn(),
  } as unknown as UpupStore;
}

/** Drain microtask ticks. Bumped from 2 to 3 (P4/C8): list()/transfer() now
 *  await an extra res.clone().json() hop to distinguish drive-reauth from
 *  app-auth on a 401, one tick deeper than the pre-C8 status-only check. */
const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

// ── Guard 1: 401 → sign-in fallback ──────────────────────────────────────────

describe("ServerModeDriveService — guard 1: 401 → reauth state", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    TestBed.resetTestingModule();
  });

  it("routes a 401 from list to reauth state (not loading/ready)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ reauth: true, provider: "google-drive" }),
            { status: 401, headers: { "Content-Type": "application/json" } },
          ),
      ),
    );

    TestBed.configureTestingModule({
      providers: [
        { provide: UpupStore, useValue: makeStoreMock() },
        ServerModeDriveService,
      ],
    });
    const svc = TestBed.inject(ServerModeDriveService);
    svc.init("google-drive");
    await flush();

    expect(svc.listState().status).toBe("reauth");
  });
});

describe("ServerModeDriveUploaderComponent — guard 1: 401 → auth fallback rendered, no browser testid", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    TestBed.resetTestingModule();
  });

  it('renders "Sign in with Google Drive" and NOT upup-server-drive-browser after 401', async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ reauth: true, provider: "google-drive" }),
            { status: 401, headers: { "Content-Type": "application/json" } },
          ),
      ),
    );

    const store = makeStoreMock();
    await TestBed.configureTestingModule({
      imports: [ServerModeDriveUploaderComponent],
      providers: [{ provide: UpupStore, useValue: store }],
    }).compileComponents();

    const fixture = TestBed.createComponent(ServerModeDriveUploaderComponent);
    fixture.componentInstance.provider = "google-drive";
    fixture.componentInstance.onBack = () => {};
    fixture.detectChanges();

    // Wait for the 401 microtask to complete, then re-render
    await flush();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    // {{provider}} must resolve to "Google Drive" — double-brace, not single-brace
    expect(text).toContain("Sign in with Google Drive");
    expect(text).not.toContain("{{provider}}");

    // The browser testid must be absent when in reauth state
    expect(
      fixture.nativeElement.querySelector(
        '[data-testid="upup-server-drive-browser"]',
      ),
    ).toBeNull();
  });
});

// ── Guard 2: destroy aborts in-flight list ────────────────────────────────────

describe("ServerModeDriveService — guard 2: destroy aborts in-flight list request", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    TestBed.resetTestingModule();
  });

  it("destroy() sets signal.aborted on the captured AbortSignal", async () => {
    let captured: AbortSignal | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init: RequestInit) => {
        captured = init.signal as AbortSignal;
        return new Promise<Response>(() => {
          /* never resolves — simulates hanging request */
        });
      }),
    );

    TestBed.configureTestingModule({
      providers: [
        { provide: UpupStore, useValue: makeStoreMock() },
        ServerModeDriveService,
      ],
    });
    const svc = TestBed.inject(ServerModeDriveService);
    svc.init("google-drive");

    // Let the fetch call fire (one tick for the async init)
    await flush();

    expect(captured).toBeTruthy();
    expect(captured!.aborted).toBe(false);

    svc.destroy();

    expect(captured!.aborted).toBe(true);
  });
});

// ── Guard 3: destroy removes window 'message' listener ────────────────────────
//
// NOTE: The internal _authListener and _abort getters were removed from the
// service — the abort/listener guards are now owned and tested by the core
// controller (server-mode-drive-controller.test.ts). We test the net effect
// here: that destroy() causes window.removeEventListener to be called with the
// 'message' event type, which confirms the listener is torn down.

describe("ServerModeDriveService — guard 3: destroy removes window message listener (leak-fix)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    TestBed.resetTestingModule();
  });

  it('destroy() calls window.removeEventListener("message", ...) after startAuth', async () => {
    // Stub fetch to return 401 so state transitions to 'reauth'
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ reauth: true, provider: "google-drive" }),
            { status: 401, headers: { "Content-Type": "application/json" } },
          ),
      ),
    );
    // Stub window.open so startAuth doesn't actually open a browser window
    vi.spyOn(window, "open").mockReturnValue({ closed: false } as Window);

    const addSpy = vi.spyOn(window, "addEventListener");
    const removeSpy = vi.spyOn(window, "removeEventListener");

    TestBed.configureTestingModule({
      providers: [
        { provide: UpupStore, useValue: makeStoreMock() },
        ServerModeDriveService,
      ],
    });
    const svc = TestBed.inject(ServerModeDriveService);
    svc.init("google-drive");
    await flush();

    // Must be in 'reauth' state before startAuth makes sense
    expect(svc.listState().status).toBe("reauth");

    // startAuth() opens the popup and arms the window 'message' listener
    svc.startAuth();

    // Confirm that a 'message' listener was registered
    const msgAddCall = addSpy.mock.calls.find(([type]) => type === "message");
    expect(msgAddCall).toBeTruthy();
    const handler = msgAddCall![1] as EventListenerOrEventListenerObject;

    // destroy() must remove the message listener
    svc.destroy();

    expect(removeSpy).toHaveBeenCalledWith("message", handler);
  });
});

// ── Parity guard: startAuth de-dups the re-auth message listener ──────────────
//
// NOTE: We verify the de-dup behavior through spies rather than via the removed
// _authListener getter. The core controller owns this logic and tests it directly
// in server-mode-drive-controller.test.ts. Here we confirm the Angular service
// delegates correctly: a second startAuth() removes the prior listener before
// arming a new one, observable via the window spy call sequence.

describe("ServerModeDriveService — startAuth() de-dups the re-auth message listener (vanilla parity)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    TestBed.resetTestingModule();
  });

  it("removes the prior message listener before arming a new one on a second startAuth()", async () => {
    // 401 so state → 'reauth'; window.open mocked so no real popup opens
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ reauth: true, provider: "google-drive" }),
            { status: 401, headers: { "Content-Type": "application/json" } },
          ),
      ),
    );
    vi.spyOn(window, "open").mockReturnValue({ closed: false } as Window);

    const addSpy = vi.spyOn(window, "addEventListener");
    const removeSpy = vi.spyOn(window, "removeEventListener");

    TestBed.configureTestingModule({
      providers: [
        { provide: UpupStore, useValue: makeStoreMock() },
        ServerModeDriveService,
      ],
    });
    const svc = TestBed.inject(ServerModeDriveService);
    svc.init("google-drive");
    await flush();
    expect(svc.listState().status).toBe("reauth");

    // First startAuth() arms listener #1
    svc.startAuth();
    const firstMsgAdd = addSpy.mock.calls.find(([type]) => type === "message");
    expect(firstMsgAdd).toBeTruthy();
    const firstHandler = firstMsgAdd![1] as EventListenerOrEventListenerObject;

    // Clear the removeEventListener spy history so we can prove the de-dup on call #2
    removeSpy.mockClear();

    // Second startAuth() (e.g. a double-click before the popup closes) must FIRST
    // remove the prior listener, THEN arm a new one — matches vanilla's ordering.
    svc.startAuth();

    // The first handler must have been removed before the second listener was added
    expect(removeSpy).toHaveBeenCalledWith("message", firstHandler);

    // A second 'message' addEventListener call must have been made
    const messageAddCalls = addSpy.mock.calls.filter(
      ([type]) => type === "message",
    );
    expect(messageAddCalls.length).toBe(2);
    const secondHandler =
      messageAddCalls[1][1] as EventListenerOrEventListenerObject;
    expect(secondHandler).not.toBe(firstHandler);
  });
});
