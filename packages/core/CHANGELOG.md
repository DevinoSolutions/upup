# @upupjs/core

## 3.3.0

### Minor Changes

- [#353](https://github.com/DevinoSolutions/upup/pull/353) [`5fbd2c6`](https://github.com/DevinoSolutions/upup/commit/5fbd2c671a1834cd8e884bda455eb5602480f829) Thanks [@AminDhouib](https://github.com/AminDhouib)! - Issue-batch release: headless and server API gaps reported by v1→v3 migrators.

    - `@upupjs/react` re-exports the full core error surface — `UpupError` and its six subclasses, `UpupErrorCode`, and `uploadErrorFromResponse` — so framework-only apps no longer need a direct `@upupjs/core` dependency for typed error handling (#339). `uploadErrorFromResponse` is now on core's public entry, making the documented import real.
    - Headless prop getters (`getRootProps` / `getDropzoneProps` / `getInputProps`) now share one override contract: overrides are spread first, getter-owned functional keys are set after, event handlers are composed instead of dropped, and `getInputProps` merges `style` rather than clobbering it (#341).
    - Restriction failures raised through the file input, dropzone drop, or paste no longer surface as unhandled promise rejections — the `restriction-failed` event remains the reporting channel (#342).
    - `@upupjs/server`: new `getDownloadUrl(config, key, opts?)` primitive signs a GET for an existing key without a handler, and `downloadUrlExpiresIn` makes the download-URL expiry configurable (#343).
    - `@upupjs/server`: new `hooks.onPresignResponse` rewrites the presign, multipart-init, and sign-part responses (for proxied or non-browser-reachable storage endpoints), and an `UpupError` thrown from `onBeforeUpload` now surfaces its message and code in the 403 instead of a generic rejection (#338).
    - `@upupjs/server`: `storage` accepts a per-request resolver `(ctx) => StorageConfig` for multi-bucket routing; multipart continuations are bound to the resolved destination through the HMAC-signed upload token, and `keyStrategy` now receives `metadata` and `req` (#337).
    - `@upupjs/next`: the Pages Router handler body is `BodyInit`-compatible with newer `@types/node`.

### Patch Changes

- [#364](https://github.com/DevinoSolutions/upup/pull/364) [`8446ca0`](https://github.com/DevinoSolutions/upup/commit/8446ca0c8ad26e2a1704a2d8bd11fc306c434f5d) Thanks [@AminDhouib](https://github.com/AminDhouib)! - A custom `uploadEndpoint`'s presign failures now carry the endpoint's own error
  body. `TokenEndpointCredentials.getPresignedUrl` threw
  `Presign request failed: <status> <statusText>` without ever reading a non-ok
  response, so the sentence the endpoint wrote for the user — a plan-limit
  message, an expired-session notice — was discarded before any handler saw it,
  and the only way to recover it was to match the HTTP status out of upup's own
  message text. The strategy now reads the body and builds the error through
  `uploadErrorFromResponse`, the same helper the direct-PUT, multipart, server
  credentials and drive-transfer strategies already use: the body's message
  becomes `error.message` (what `onError` receives), a `code` field lands on
  `error.code`, and `error.status` still carries the HTTP status.

    Backward compatible: the thrown class is still `UpupNetworkError`, and when the
    body is empty or unreadable the message is byte-identical to before, so a
    consumer matching on the old wording is unaffected. Nothing in the public
    `onError` signature changes.

    `parseErrorBody` also stops discarding a valid `message` when a non-string
    `error` field sits beside it — a `{ message, error: true }` body used to fall
    all the way through to the raw-JSON text fallback.

- [#365](https://github.com/DevinoSolutions/upup/pull/365) [`03b4e82`](https://github.com/DevinoSolutions/upup/commit/03b4e82baed0d751ba5da688715ef48748e7fe51) Thanks [@AminDhouib](https://github.com/AminDhouib)! - `imageCompression` and `stripExifData` no longer flatten animated images. Both
  steps re-encode through a canvas, and canvas has no animated encoder:
  `drawImage` paints the first frame and `toBlob`/`convertToBlob` writes a still,
  so enabling either option silently replaced an uploaded animated GIF with a
  single frame — the upload succeeded and the user got a frozen image back.

    Both steps now sniff the file first and pass animated GIF, animated WebP and
    APNG through untouched. Detection is byte-level (GIF image descriptors plus the
    NETSCAPE2.0/ANIMEXTS1.0 looping extension; the APNG `acTL` chunk; the WebP
    `VP8X` animation flag and `ANIM`/`ANMF` chunks) rather than `ImageDecoder`-based,
    so it behaves identically in every browser. Still images of the same formats are
    processed exactly as before, and the upload itself is untouched either way.

    `thumbnailGenerator` is deliberately unchanged — a thumbnail is a still by
    definition, and it is stored alongside the file rather than replacing it.

## 3.2.0

### Minor Changes

- [#358](https://github.com/DevinoSolutions/upup/pull/358) [`ff8f74f`](https://github.com/DevinoSolutions/upup/commit/ff8f74fd5cd33525b491267b986d566e3e1d8b5b) Thanks [@BSalaeddin](https://github.com/BSalaeddin)! - Two follow-ups to the multipart hardening round:

    - **`resumable.maxConcurrentParts`** (default `3`): the parts-of-one-file
      concurrency cap is now public on the multipart config. More parts in flight
      buys throughput on high-bandwidth links and costs memory and sockets — each
      in-flight part holds its own chunk. Values below 1 are clamped to 1. This is
      a different axis from `maxConcurrentUploads` (files in parallel); the two
      multiply.
    - **`networkAware` is now a component prop** on every framework port (it was
      headless-only). It remains on by default — passing nothing keeps the
      offline-pauses / online-resumes behavior; `networkAware={false}` opts out.
      Omitting the prop deliberately forwards `undefined` so core's default-on
      applies.

- [#358](https://github.com/DevinoSolutions/upup/pull/358) [`da08e45`](https://github.com/DevinoSolutions/upup/commit/da08e45fe49df4824a134b69498dff223b883701) Thanks [@BSalaeddin](https://github.com/BSalaeddin)! - Server-mode multipart uploads now survive a page reload, a tab close, or a
  browser crash, resuming at the last completed part instead of restarting.

    **What shipped**

    - **`@upupjs/server`: new route `POST <base>/multipart/resume`.** Body is
      `{ token }` and nothing else; the response is
      `{ key, token, parts: [{ partNumber, eTag, size }] }` and never carries the
      `uploadId`. Trust posture matches `sign-part`: signature verification, owner
      binding via `getUserId`, and the same 403 vocabulary. The one relaxation is
      that an expired `exp` is accepted — re-issuing an expired token is the route's
      purpose — re-bounded by a resume window anchored at the ORIGINAL `init` and
      carried forward unchanged on every re-issue, so rolling resumes can never
      extend it. `/multipart/init` now stamps `iat` into the token; tokens minted
      before this release still resume, via an `exp - TTL` fallback.
    - **`@upupjs/core`: `resumable: { protocol: 'multipart' }` persists a session
      per `File`** in `localStorage` (`upup_mp_` prefix, 24h TTL, fingerprint
      `name:size:lastModified:type`, scoped to the `serverUrl`, guarded by the
      checksum step's content hash when available). On upload it presents the saved
      token to `/multipart/resume`, validates every returned part's exact byte size,
      skips the parts storage already holds, pre-fills progress, and uploads only the
      remainder. Any validation failure, 4xx, or missing route falls back silently to
      a fresh `/multipart/init` — a resume that cannot happen never fails an upload.
    - **In-session pause/resume and the automatic retry loop now continue mid-file**
      rather than restarting from part one, on the same machinery.
    - **Uploads longer than the 1-hour token TTL complete.** A `403 expired` from
      `sign-part`/`complete` triggers one shared refresh through `/multipart/resume`
      and a retry; the concurrent part uploaders share a single in-flight refresh.
    - **`crashRecovery` and multipart persistence now compose into the full reload
      story:** IndexedDB restores the file list (as `PAUSED`), `resume()` re-attaches
      the transfer mid-file. Fingerprint preservation through crash-recovery revival
      is test-pinned.
    - **UI: a paused file with progress can now be removed.** Previously any file
      carrying progress had its remove control disabled; a restored/paused file now
      carries seeded progress, so the rule changed to "locked only while actively in
      flight". Identical across all five component ports.
    - **New config `multipartResumeWindowSeconds`** on `UpupServerConfig`, default
      `86400` (24h, matching the client session TTL). `0` disables the route, which
      clients see as an old server and fall back from gracefully. A negative or
      fractional value throws `UpupConfigError` at construction.
    - **New `UpupErrorCode.NOT_FOUND`.** `/multipart/resume` answers `404` with it
      when the provider no longer holds the upload (completed, aborted, or reaped by
      a lifecycle rule) — deliberately a 4xx so clients drop the session and start
      fresh rather than retrying something that can never come back. New
      `UpupStorageError` operation `'multipart-resume'`.

    **Behavior change: `persist` now defaults to `true`**

    `resumable.persist` was previously accepted but never read. It now defaults to
    `true`, and with it on a failed, paused, or abandoned multipart upload no longer
    issues a best-effort `/multipart/abort` — its server-side parts are kept
    deliberately, because they are exactly what the next attempt resumes from.
    Explicit `cancel()` / `removeFile()` / `removeAll()` still abort and clear the
    session. `persist: false` restores the previous abort-on-failure behavior
    exactly.

    **Action required: configure an S3 lifecycle rule**

    Because interrupted uploads now keep their parts, parts that are never resumed
    are never cleaned up by upup, and S3 bills for them. Set an
    `AbortIncompleteMultipartUpload` lifecycle rule on your bucket with a 1–7 day
    expiry. Every S3-compatible provider supports it, MinIO included.

    **Contract change**

    `CredentialStrategy.listParts?` is removed. It was declared but never
    implemented and never called — no runtime behavior depended on it. Its
    replacement is `CredentialStrategy.resumeMultipartUpload?`, implemented by
    `ServerCredentials`. Also additive: `MultipartPart.size?` and the new
    `MultipartResumeResponse` type.

    **Security note**

    The resume route extends the usable life of a leaked upload token from one hour
    to the resume window. What that token can do is unchanged and narrow: continue
    the same upload, to the same key, inside the same signed size envelope, still
    owner-bound whenever `getUserId` is configured. Shorten
    `multipartResumeWindowSeconds`, or set it to `0`, if that trade is not one you
    want.

- [#358](https://github.com/DevinoSolutions/upup/pull/358) [`5597477`](https://github.com/DevinoSolutions/upup/commit/5597477e29ad970f249b3a6b7b4912495e8a0503) Thanks [@BSalaeddin](https://github.com/BSalaeddin)! - Multipart transfer-layer hardening: per-part retries with a stall watchdog,
  connectivity-aware pause/resume, an opt-in crash-restore auto-resume, and a
  client-side guard for S3's 10,000-part cap.

    **What shipped**

    - **Per-part retry with backoff — new `resumable.retryDelays`** (default
      `[0, 1000, 3000, 5000]`, the same vocabulary tus uses; `[]` disables). A
      part whose sign or PUT fails transiently — network error, watchdog timeout,
      HTTP `429`, any `5xx` — is retried on this schedule instead of failing the
      file. Definitive rejections (`403` forged token, `400`) still fail
      immediately. The retry delay is abort-aware: `pause()`/cancel cuts the wait
      short. Part retries sit inside one run; `maxRetries` still governs whole-run
      retries around them.
    - **Part stall watchdog — new `resumable.partTimeoutMs`** (default `180000`).
      An inactivity timer, not a deadline on the whole transfer: a part is timed
      out only after this long with no upload progress at all, so a slow-but-steady
      link is never penalized no matter the part size. A genuinely stalled or dead
      connection is aborted and surfaces as a retryable `UpupErrorCode.TIMEOUT`
      instead of hanging the upload forever. The PUT is measured by upload
      progress; the sign call, which has none, is bounded by the same value as a
      plain deadline.
    - **Connectivity awareness — new core option `networkAware`** (default on,
      no-op outside a browser). Going offline mid-upload pauses the run — with
      multipart `persist` on, that keeps the server-side session alive instead of
      burning whole-run retries against a dead network — and coming back online
      resumes it. `online` only ever resumes a pause the offline handler made; a
      pause the user chose is never overruled. `false` restores the previous
      fail-and-retry behavior.
    - **Opt-in auto-resume — new `resumable.autoResume`** (default off). With it
      on, a crash-restored multipart upload continues by itself instead of
      waiting for the Resume click. Off by default because closing a tab is as
      often "cancel" as "oops" — the explicit click stays the shipped-UI default.
    - **10,000-part cap client fallback.** When an init response carries no
      `partSize`, the client now sizes parts as
      `max(chunkSizeBytes, ceil(fileSize / 10000))` instead of trusting the raw
      chunk size — without this, a >48.8 GiB file against a partSize-less server
      would fail at part 10,001. The server's `partSize` still wins whenever
      present (`@upupjs/server` already clamps it the same way, now pinned by
      boundary tests).

### Patch Changes

- [#362](https://github.com/DevinoSolutions/upup/pull/362) [`de8b363`](https://github.com/DevinoSolutions/upup/commit/de8b3635a1eafa04c378a5f5af14e22ba99b3fe5) Thanks [@BSalaeddin](https://github.com/BSalaeddin)! - Multipart part PUTs now materialize each slice to an ArrayBuffer before
  `xhr.send`, instead of handing XHR a lazy Blob reference. Firefox streams Blob
  bodies lazily during send, and when the Blob is a slice of a File revived from
  IndexedDB after a page reload (crash-recovery resume), that lazy read could
  stall — headers went out, the body never followed, and the storage backend
  timed the part out as a 503 storm. Reading the bytes up front turns a broken
  source into a clean, retryable failure: a read rejection (e.g. Firefox
  `NotReadableError`) burns one `retryDelays` slot and re-reads the slice fresh,
  a read that never settles is cut off by its own `partTimeoutMs` deadline
  (a separate window from the PUT's inactivity watchdog, which starts fresh
  after the read), and aborting the upload cancels an in-flight read
  immediately. Materialization is capped at 16 MiB per part — larger parts
  (part size scales with file size past ~48 GiB via the 10,000-part clamp) keep
  the streaming Blob path, so transient memory is bounded by
  `maxConcurrentParts × min(partSize, 16 MiB)` (plus XHR's own copy of the
  buffer while sending).

- [#362](https://github.com/DevinoSolutions/upup/pull/362) [`de8b363`](https://github.com/DevinoSolutions/upup/commit/de8b3635a1eafa04c378a5f5af14e22ba99b3fe5) Thanks [@BSalaeddin](https://github.com/BSalaeddin)! - `IndexedDBStorage` (crash recovery) now holds one cached IndexedDB connection
  for its lifetime instead of opening and closing the database around every
  operation. Firefox ties Blob/File handles read from IndexedDB to the
  connection they were read over: closing it right after the crash-recovery
  restore invalidated the revived File's backing store, and mid-resume slice
  reads rejected with `AbortError` — a Firefox-only reload-resume stall
  (Chromium materializes IndexedDB blobs independently and was unaffected).
  Keeping the connection open keeps the revived File readable for the whole
  resume. The cached connection still yields to the rest of the browser: a
  `versionchange` (e.g. `deleteDatabase` from another tab) closes and releases
  it, and a browser-initiated `close` makes the next operation reopen cleanly.

## 3.1.0

### Minor Changes

- [#325](https://github.com/DevinoSolutions/upup/pull/325) [`79a2861`](https://github.com/DevinoSolutions/upup/commit/79a2861ffc6259485075ac54c85c564fd58c7b86) Thanks [@AminDhouib](https://github.com/AminDhouib)! - Redesigned default experience + refined component interface.

    **New default UI (all six frameworks, React-canonical):** a single selected
    file now renders as a `FileHero`; two or more render as a card list; source
    overlays gain a labelled `Back` action; file removal defers ~200ms for a
    smooth exit. A new `upup-fx-*` animation layer ships enabled by default.

    **Interface additions (`<UpupUploader>` props, identical across frameworks):**

    - `animations?: boolean` (default `true`) — decorative motion layer; `false`
      disables it (spinner/progress/focus always stay). Also forced off under
      `prefers-reduced-motion`.
    - `quietCompletion?: boolean` (default `false`) — on success, show only a
      brief checkmark and hand off to the completion callbacks/events (no Done
      button or summary), for apps that own the post-upload flow.
    - `imageEditor` now defaults on (React/Preact only) with a visible edit
      affordance; pass `imageEditor={false}` to opt out.

    **Non-visual:** all packages adopt `exactOptionalPropertyTypes` /
    `noUncheckedIndexedAccess`; `@upupjs/server` upload/drive routing is
    decomposed by concern behind a single CORS-safe responder. No breaking
    changes to the existing prop names or event contract — the additions are
    backward-compatible.
