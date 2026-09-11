# @useupup/core

## 3.3.3

### Patch Changes

- [#394](https://github.com/DevinoSolutions/upup/pull/394) [`bf817fc`](https://github.com/DevinoSolutions/upup/commit/bf817fc1bf57b56cc4ca7e6e11209a6ab4429f4d) Thanks [@BSalaeddin](https://github.com/BSalaeddin)! - Declining an OAuth consent screen is reported as a cancellation, not as
  "Popup was blocked by the browser".

    Three things compounded. `DriveAuthFallback` auto-triggers sign-in on mount so
    the tile click's transient user activation is still live — but OneDrive, Dropbox
    and Box rendered it WITHOUT passing `error` (it stayed inside the
    `...uploaderProps` rest), so its `|| error` guard could never fire. A decline
    drove `isLoading` false, the view re-mounted with a fresh `attemptedRef`, and it
    retried by itself. That second `window.open` had no activation left, returned
    null, and `popup-oauth-plugin` reported the block — truthful about its own call,
    misleading about the user, who was sent into their browser's popup settings over
    a choice they had made themselves.

    The decline was also never surfaced on its own: the popup poll accepted only
    `href.startsWith(redirectUri) && href.includes('code=')`, so an
    `?error=access_denied` redirect fell through until the window closed, and a
    closed window resolved silently with no error and no state.

    Now:

    - Every drive component in every framework forwards `error` into its auth
      fallback, so the existing no-auto-retry-after-an-error guard is reachable
      across the remount (the guard itself stays React-only — no other framework's
      fallback auto-triggers on mount). The three popup providers had the same gap
      in React, Vue, Svelte, Angular and vanilla; vanilla gated the prop on Google
      Drive explicitly.
    - The poll reads `error` / `error_description` off the redirect and reports a
      refused or admin-walled consent as a cancellation; a closed window is a
      cancellation too, rather than a silent resolve. `authenticateViaPopup()` still
      RESOLVES in both cases — the promise contract is unchanged, and the
      cancellation travels on the provider's existing error event.
    - Cancellations carry `AUTH_DENIED` and a real popup block carries the new
      `AUTH_POPUP_BLOCKED` code, so the two can finally be told apart. The drive
      controller turns those into a `messageKey` on `DriveBrowserError`, and the
      renderer shows the matching catalogue string — the nine-locale `popupBlocked`
      that shipped unused, or a new `errors.authCancelled`. Every other failure keeps
      its own message, which carries detail a generic string would throw away.
    - A popup attempt that ends without a session now clears `isLoading`, cannot
      become an unhandled rejection, and ALWAYS leaves an error behind. A blocked
      popup threw before the state ever moved to `authenticating`, so the view sat on
      the spinner and the auth fallback carrying the error never rendered at all.
      Recording the error is not cosmetic: the React auth fallback opens one popup on
      mount while the tile click's user activation is live, and reads `error` to know
      an attempt has already happened — its own ref cannot, because clearing
      `isLoading` remounts the view with a fresh one. Most failures arrive on the
      provider's error event and are already in state; the gap was the ones that only
      THROW, such as an unconfigured `clientId`, which `getAuthUrl()` throws and never
      emits.

    `UpupAuthError` takes an optional third `code` argument, defaulting to the
    `AUTH_PROVIDER_ERROR` it always used, so existing call sites are unchanged.

    `ErrorMessages.authCancelled` is OPTIONAL, so a hand-written locale bundle still
    type-checks — that is why this is a patch and not a breaking minor. The uploader
    wires en-US as the fallback bundle and would resolve the key anyway;
    `driveErrorText` also carries the English wording for a translator built with no
    fallback at all, so an omission renders English rather than the key.

    The redirect poll reads the fragment as well as the query. The check it replaced
    matched `code=` anywhere in the href, so narrowing to `searchParams` alone would
    have left a spec-legal fragment-mode redirect unread until the window closed —
    reported, wrongly again, as a cancellation.

## 3.3.2

### Patch Changes

- [#407](https://github.com/DevinoSolutions/upup/pull/407) [`5921da4`](https://github.com/DevinoSolutions/upup/commit/5921da4d1c3094d76fbbd0f5deee7a1c5e7efbe9) Thanks [@BSalaeddin](https://github.com/BSalaeddin)! - Review fixes for the Google Drive shared-drives support that shipped in 3.3.1,
  behind the same default-off `cloudDrives.googleDrive.sharedDrives` flag. Nothing
  changes for a picker that leaves the flag unset.

    A `drives.list` failure — a 403 under a Workspace sharing policy, a 429, a 5xx —
    now degrades to no shared-drive rows instead of taking the whole root listing
    down with it. The call was awaited unguarded inside `loadFiles`, so for a user
    with the flag on, one non-2xx from that endpoint threw away the My Drive
    children the listing had already fetched and left the picker empty. The failure
    is reported on a new non-fatal `google-drive:shared-drives-error` event, and
    drives collected before a mid-pagination failure are kept.

    Drive folder ids are escaped into the `files.list` query instead of interpolated
    raw, using the same `escapeDriveQueryValue` the server-mode drive client uses.
    That escaper moved from `@useupup/server` into `@useupup/core/internal` and
    `@useupup/server` re-exports it, so the two halves share ONE implementation that
    cannot drift.

    The shared-drive rows and the virtual "Shared with me" row lead the root's first
    page rather than trailing it, so they stay above a second page of My Drive files
    instead of being pushed below one. They are still emitted on the first page only,
    so they appear exactly once and pagination is unaffected in either view.

## 3.3.1

### Patch Changes

- [#393](https://github.com/DevinoSolutions/upup/pull/393) [`7df75e6`](https://github.com/DevinoSolutions/upup/commit/7df75e6b430e080bf8f3931297ec171d86ff19ce) Thanks [@BSalaeddin](https://github.com/BSalaeddin)! - The Google Drive picker can browse shared drives and "Shared with me", behind a
  default-off `cloudDrives.googleDrive.sharedDrives` flag.

    `GoogleDrivePlugin.loadFiles` and `loadMoreFiles` sent a Drive v3 `files.list`
    with no `corpora`, no `includeItemsFromAllDrives` and no `supportsAllDrives`, so
    the API answered from the signed-in user's own My Drive corpus only. For a
    business account that is most of the person's files: a file living in a shared
    drive never appeared at any depth, and the picker's search box did not
    compensate because it filters the children already loaded rather than issuing a
    query. The requested scope was never the limit — `drive.readonly` covers shared
    drives, and `drives.list`, already.

    With `sharedDrives: true`:

    - Both listing calls send `corpora=allDrives`, `includeItemsFromAllDrives=true`
      and `supportsAllDrives=true`, and the single-file download sends
      `supportsAllDrives=true` so a file the widened listing surfaced can actually be
      fetched instead of answering 404. `corpora` and `includeItemsFromAllDrives` are
      `files.list`-only and stay off the download.
    - The ROOT listing appends the user's shared drives, from a paginated
      `drives.list`, as navigable folder rows after the My Drive children. Those
      params widen which files a query CAN return, but every listing is still
      `'<parentId>' in parents` and `'root'` resolves to My Drive root — so without
      an entry to click, a shared drive stayed unreachable. A shared drive's root
      folder id IS its drive id, so once one is listed the ordinary parent listing
      walks it with no further special-casing.
    - The root listing also carries one virtual "Shared with me" folder. Drive has no
      parent whose children are the files others shared with you — it is the query
      `sharedWithMe = true` — so that row uses a synthetic id the plugin branches on
      in both `loadFiles` and `loadMoreFiles`. Every other part of the picker treats
      it as an ordinary folder.

    Both additions land on the root's first page only, never on a continuation page,
    so they appear exactly once and pagination is unaffected in either the shared
    drives or the "Shared with me" view.

    The flag defaults off. Nothing is sent, no `drives.list` is issued and no extra
    row appears when it is unset or false, so no existing picker changes shape.

- [#396](https://github.com/DevinoSolutions/upup/pull/396) [`e4393b5`](https://github.com/DevinoSolutions/upup/commit/e4393b5652add229c9d5fa849cba2ba97913f7cf) Thanks [@AminDhouib](https://github.com/AminDhouib)! - The default source set no longer shows capture sources whose output can never
  satisfy `allowedFileTypes` (#340).

    `allowedFileTypes: 'application/pdf'` used to leave the camera, microphone and
    screen chips in place, and every recording they produced was rejected the moment
    it was added. `normalizeUploaderOptions` now drops a default capture source when
    no entry in the resolved accept list could match anything that source can emit —
    camera emits `image/jpeg` (with `image/png` as the `toDataURL` fallback),
    microphone `audio/webm` / `audio/ogg` / `audio/mp4`, screen `video/webm` /
    `video/mp4`, all read off the code that builds the `File`.

    The match fails open: a wildcard, an unrecognized extension, or anything that is
    neither a MIME type nor an extension keeps every source. `local` and `url` are
    never filtered, cloud drives are untouched, and an explicitly passed `sources`
    array is always honored verbatim. A dropped source logs one dev-only
    `console.warn` naming the source and the accept list.

- [#397](https://github.com/DevinoSolutions/upup/pull/397) [`db9ea90`](https://github.com/DevinoSolutions/upup/commit/db9ea90af5b1916763d607baee81e118b6d7c718) Thanks [@AminDhouib](https://github.com/AminDhouib)! - The default panel now shows your error message next to the machine code, and a
  skipped EXIF strip leaves a marker on the file (#367 items 2 and 4).

    A failure carrying a code used to render as `uploadFailedWithCode`, which
    interpolated the code and nothing else — so an endpoint that returned a useful
    sentence watched it disappear between `onError` and the panel. The key now has a
    second `{message}` slot carrying the error's own message, added to all nine
    locale bundles so translators control placement (override the key to reorder the
    slots, drop the code, or show only your own wording). All six framework panels
    pass both values, and the message is rendered as text, never as markup.

    `stripExifData` skips animated GIF/WebP/APNG because canvas has no animated
    encoder, which means an animated WebP or APNG reaches storage with the EXIF you
    asked to remove. The `exif` step now records that on the file:
    `metadata.metadataStripSkipped === true` with
    `metadata.metadataStripSkippedReason === 'animated-image'`. A file whose EXIF
    really was stripped carries `exifStripped: true` and no marker, and
    `imageCompression` skipping an animated image does not set it — nothing was asked
    to be removed. No new event, no new option.

- [#381](https://github.com/DevinoSolutions/upup/pull/381) [`720d273`](https://github.com/DevinoSolutions/upup/commit/720d2735d268b242338b70afa380161cf7107036) Thanks [@AminDhouib](https://github.com/AminDhouib)! - Presign failures no longer surface a reverse proxy's HTML error page, and the
  animated-image guard stops reading whole files.

    `TokenEndpointCredentials.getPresignedUrl` reads a failed presign body so the
    endpoint's own sentence reaches `onError`, but `parseErrorBody`'s text fallback
    also caught the error pages nginx and Cloudflare write for a 502 or 413 — so a
    handler that used to get `Presign request failed: 502 Bad Gateway` got 200
    characters of `<html>` instead. A markup body carrying no error code is now
    treated as nothing to surface and the status-line wording is kept. An S3-style
    `<Error><Code>` body is unaffected: it parses to a real code and still comes
    through. The error is also built with its final message rather than having
    `message` reassigned afterwards, so the body is parsed once and the error never
    carries wording it does not keep. `uploadErrorFromResponse` gained two optional
    arguments for this — `fallbackMessage` (wording to use when the body carries
    nothing) and `ignoreErrorPageBody` (opt into the markup guard); callers that
    pass neither behave exactly as before.

    `isAnimatedImage` — the guard that keeps `imageCompression` and `stripExifData`
    from flattening animated GIF/WebP/APNG — used to call `arrayBuffer()` on the
    whole file, a read the main-thread path never made before that guard existed,
    so a still 40 MB photo was materialized in full just to learn it was still. It
    now sniffs the first 64 KiB, which is where every one of these formats declares
    animation (APNG's `acTL` before the first `IDAT`, WebP's `VP8X`/`ANIM` at the
    top of the container, a looping GIF's `NETSCAPE2.0` extension in the header).
    Only a GIF that has announced nothing by then is read in full, because its
    second Image Descriptor can sit anywhere in the stream. Verdicts are unchanged.

## 3.3.0

### Minor Changes

- [#353](https://github.com/DevinoSolutions/upup/pull/353) [`5fbd2c6`](https://github.com/DevinoSolutions/upup/commit/5fbd2c671a1834cd8e884bda455eb5602480f829) Thanks [@AminDhouib](https://github.com/AminDhouib)! - Issue-batch release: headless and server API gaps reported by v1→v3 migrators.

    - `@useupup/react` re-exports the full core error surface — `UpupError` and its six subclasses, `UpupErrorCode`, and `uploadErrorFromResponse` — so framework-only apps no longer need a direct `@useupup/core` dependency for typed error handling (#339). `uploadErrorFromResponse` is now on core's public entry, making the documented import real.
    - Headless prop getters (`getRootProps` / `getDropzoneProps` / `getInputProps`) now share one override contract: overrides are spread first, getter-owned functional keys are set after, event handlers are composed instead of dropped, and `getInputProps` merges `style` rather than clobbering it (#341).
    - Restriction failures raised through the file input, dropzone drop, or paste no longer surface as unhandled promise rejections — the `restriction-failed` event remains the reporting channel (#342).
    - `@useupup/server`: new `getDownloadUrl(config, key, opts?)` primitive signs a GET for an existing key without a handler, and `downloadUrlExpiresIn` makes the download-URL expiry configurable (#343).
    - `@useupup/server`: new `hooks.onPresignResponse` rewrites the presign, multipart-init, and sign-part responses (for proxied or non-browser-reachable storage endpoints), and an `UpupError` thrown from `onBeforeUpload` now surfaces its message and code in the 403 instead of a generic rejection (#338).
    - `@useupup/server`: `storage` accepts a per-request resolver `(ctx) => StorageConfig` for multi-bucket routing; multipart continuations are bound to the resolved destination through the HMAC-signed upload token, and `keyStrategy` now receives `metadata` and `req` (#337).
    - `@useupup/next`: the Pages Router handler body is `BodyInit`-compatible with newer `@types/node`.

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

    - **`@useupup/server`: new route `POST <base>/multipart/resume`.** Body is
      `{ token }` and nothing else; the response is
      `{ key, token, parts: [{ partNumber, eTag, size }] }` and never carries the
      `uploadId`. Trust posture matches `sign-part`: signature verification, owner
      binding via `getUserId`, and the same 403 vocabulary. The one relaxation is
      that an expired `exp` is accepted — re-issuing an expired token is the route's
      purpose — re-bounded by a resume window anchored at the ORIGINAL `init` and
      carried forward unchanged on every re-issue, so rolling resumes can never
      extend it. `/multipart/init` now stamps `iat` into the token; tokens minted
      before this release still resume, via an `exp - TTL` fallback.
    - **`@useupup/core`: `resumable: { protocol: 'multipart' }` persists a session
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
      present (`@useupup/server` already clamps it the same way, now pinned by
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
    `noUncheckedIndexedAccess`; `@useupup/server` upload/drive routing is
    decomposed by concern behind a single CORS-safe responder. No breaking
    changes to the existing prop names or event contract — the additions are
    backward-compatible.
