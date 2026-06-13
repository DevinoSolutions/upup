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
  // Fire BOTH `input` and `change`. React backs `onChange` on a file input with
  // the native `change` event, but preact/compat remaps `onChange` to `input` —
  // a `change`-only dispatch is silently ignored there. Vue/Svelte/Vanilla listen
  // for `change`. `@upup/core`'s addFiles dedupes by content, so a host that
  // reacts to both still adds the file exactly once.
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new Event('change', { bubbles: true }))
}

/**
 * Feed `file` into the uploader and resolve once `done()` is truthy, RE-FEEDING
 * on each interval until then. Most hosts register the file on the first
 * dispatch, but preact/compat attaches the file input's listener a tick after
 * the element mounts (and may briefly swap the element), so a single early
 * dispatch can be missed. Re-feeding is idempotent: `@upup/core` dedupes by
 * content, so only the first landed feed registers the file. Throws on timeout.
 */
export async function feedFileUntil(
  root: ParentNode,
  file: File,
  done: () => boolean,
  { timeout = 15000, interval = 300 }: WaitForOptions = {},
): Promise<void> {
  const start = Date.now()
  for (;;) {
    if (done()) return
    feedFile(root, file)
    const sliceEnd = Date.now() + interval
    while (Date.now() < sliceEnd) {
      if (done()) return
      await new Promise((r) => setTimeout(r, 50))
    }
    if (Date.now() - start >= timeout) {
      if (done()) return
      throw new Error(`feedFileUntil: condition not met after ${timeout}ms`)
    }
  }
}

export interface RequestCapture {
  /** Each captured request as "<url> <stringBody>". */
  entries: string[]
  /** Restore the original `fetch`. Always call this (e.g. in a `finally`). */
  restore(): void
}

/**
 * Wrap `fetch` on `target` to record every request as "<url> <stringBody>".
 *
 * This is the cross-framework signal for "what did the uploader actually send".
 * The uploader's pipeline (e.g. HEIC→JPEG) rewrites the file *for upload* but the
 * rendered file tile keeps the original name, so the presign request body — which
 * carries the converted `name`/`type`/`heicConverted` metadata — is the reliable
 * proof that conversion happened. `@upup/core`'s presign call is a `fetch` in
 * every framework, so wrapping `fetch` works for all six hosts. Default target is
 * `globalThis`; pass a stub `{ fetch }` to unit-test.
 */
export function captureRequests(
  target: { fetch: typeof fetch } = globalThis as unknown as { fetch: typeof fetch },
): RequestCapture {
  const entries: string[] = []
  const realFetch = target.fetch
  target.fetch = function (this: unknown, input: RequestInfo | URL, init?: RequestInit) {
    try {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.href
            : (input as Request).url
      const body = init && typeof init.body === 'string' ? init.body : ''
      entries.push(`${url} ${body}`)
    } catch {
      /* never let capture break the request */
    }
    // eslint-disable-next-line prefer-rest-params
    return realFetch.apply(this, arguments as unknown as Parameters<typeof fetch>)
  } as typeof fetch
  return {
    entries,
    restore() {
      target.fetch = realFetch
    },
  }
}
