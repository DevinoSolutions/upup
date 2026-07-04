/**
 * file-preview-portal.component.spec.ts — F-605
 *
 * Pins: Escape closes the preview via a WINDOW-level keydown listener, matching
 * the react/vue/svelte canon (FilePreviewPortal.tsx:70-76). Before this fix, angular
 * only bound `(keydown)` on the dialog div itself, which the modal never focuses
 * (it opens from a click outside the portal subtree) — so Escape silently no-opped.
 * Dispatching the event on `window` with focus deliberately left elsewhere reproduces
 * that real-world path and proves the fix is not relying on the (harmless, still-kept)
 * local handler.
 */

import { describe, it, expect, vi } from "vitest";
import { TestBed } from "@angular/core/testing";
import { UpupStore } from "../upup-store.service";
import { FilePreviewPortalComponent } from "./file-preview-portal.component";

/** Minimal UpupStore mock — same shape as file-list.spec.ts's makeStoreMock,
 *  trimmed to only what FilePreviewPortalComponent reads. */
function makeStoreMock() {
  return {
    isDark: () => false,
    slotOverrides: () => ({ filePreviewPortal: "" }),
    translations: () =>
      ({
        cancel: "Cancel",
        loading: "Loading…",
        previewError: "Error:",
      }) as any,
  };
}

describe("FilePreviewPortalComponent — Escape closes (F-605)", () => {
  it("closes on a window-level Escape keydown even when focus is outside the dialog", async () => {
    const storeMock = makeStoreMock();

    await TestBed.configureTestingModule({
      imports: [FilePreviewPortalComponent],
      providers: [{ provide: UpupStore, useValue: storeMock }],
    }).compileComponents();

    const fixture = TestBed.createComponent(FilePreviewPortalComponent);
    fixture.componentInstance.fileType = "image/jpeg";
    fixture.componentInstance.fileUrl = "blob:http://localhost/test";
    fixture.componentInstance.fileName = "test.jpg";
    fixture.detectChanges();

    const closeSpy = vi.fn();
    fixture.componentInstance.onClose.subscribe(closeSpy);

    // Deliberately dispatch on `window`, NOT on the dialog element — document.body
    // is the active element here, reproducing "modal opened by an outside click,
    // focus never entered the dialog."
    expect(
      document.activeElement ===
        fixture.nativeElement.querySelector('[role="dialog"]'),
    ).toBe(false);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  it("does not close on other keys", async () => {
    const storeMock = makeStoreMock();

    await TestBed.configureTestingModule({
      imports: [FilePreviewPortalComponent],
      providers: [{ provide: UpupStore, useValue: storeMock }],
    }).compileComponents();

    const fixture = TestBed.createComponent(FilePreviewPortalComponent);
    fixture.componentInstance.fileType = "image/jpeg";
    fixture.componentInstance.fileUrl = "blob:http://localhost/test";
    fixture.componentInstance.fileName = "test.jpg";
    fixture.detectChanges();

    const closeSpy = vi.fn();
    fixture.componentInstance.onClose.subscribe(closeSpy);

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));

    expect(closeSpy).not.toHaveBeenCalled();
  });

  it("removes the window listener on destroy (no leak / no late-fire)", async () => {
    const storeMock = makeStoreMock();

    await TestBed.configureTestingModule({
      imports: [FilePreviewPortalComponent],
      providers: [{ provide: UpupStore, useValue: storeMock }],
    }).compileComponents();

    const fixture = TestBed.createComponent(FilePreviewPortalComponent);
    fixture.componentInstance.fileType = "image/jpeg";
    fixture.componentInstance.fileUrl = "blob:http://localhost/test";
    fixture.componentInstance.fileName = "test.jpg";
    fixture.detectChanges();

    const closeSpy = vi.fn();
    fixture.componentInstance.onClose.subscribe(closeSpy);

    fixture.destroy();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

    expect(closeSpy).not.toHaveBeenCalled();
  });
});
