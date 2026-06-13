// src/testing/dom.ts
// Framework-agnostic helpers for driving the uploader from a Storybook `play`
// and asserting on what it rendered. Selectors are the shared core conventions
// present in all six framework hosts.

const FILE_ITEM_SELECTOR = '[data-testid="upup-file-item"]'

/** Minimal structural surface the parsers need — lets them unit-test on a stub. */
export interface QueryRoot {
  querySelector(selectors: string): Element | null
  querySelectorAll(selectors: string): ArrayLike<{ textContent: string | null }>
}

export interface WaitForOptions {
  timeout?: number
  interval?: number
}

/** Poll `fn` until it returns a truthy value; resolve with it, or reject on timeout. */
export async function waitFor<T>(
  fn: () => T | null | undefined | false,
  { timeout = 5000, interval = 50 }: WaitForOptions = {},
): Promise<T> {
  const start = Date.now()
  for (;;) {
    const v = fn()
    if (v) return v
    if (Date.now() - start >= timeout) {
      throw new Error(`waitFor: timed out after ${timeout}ms`)
    }
    await new Promise((r) => setTimeout(r, interval))
  }
}

/** Names (collapsed tile text) of every rendered file tile under `root`. */
export function getRenderedFileNames(root: QueryRoot): string[] {
  return Array.from(root.querySelectorAll(FILE_ITEM_SELECTOR)).map((el) =>
    (el.textContent ?? '').replace(/\s+/g, ' ').trim(),
  )
}

/** True when any rendered file tile shows a .jpg/.jpeg name (HEIC→JPEG happened). */
export function isJpegProduced(root: QueryRoot): boolean {
  return getRenderedFileNames(root).some((t) => /\.jpe?g/i.test(t))
}

export function assertJpegProduced(root: QueryRoot): void {
  if (!isJpegProduced(root)) {
    throw new Error(
      `assertJpegProduced: no .jpg/.jpeg tile found. Rendered: ${JSON.stringify(getRenderedFileNames(root))}`,
    )
  }
}

/**
 * Push a File into the uploader's hidden <input type=file> and fire `change`.
 * Browser-only (uses real DataTransfer) — exercised by the play functions.
 */
export function feedFile(root: ParentNode, file: File): void {
  const input = root.querySelector('input[type="file"]') as HTMLInputElement | null
  if (!input) throw new Error('feedFile: no input[type="file"] under root')
  const dt = new DataTransfer()
  dt.items.add(file)
  input.files = dt.files
  input.dispatchEvent(new Event('change', { bubbles: true }))
}
