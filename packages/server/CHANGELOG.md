# @useupup/server

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

- Updated dependencies [[`5921da4`](https://github.com/DevinoSolutions/upup/commit/5921da4d1c3094d76fbbd0f5deee7a1c5e7efbe9)]:
    - @useupup/core@3.3.2

## 3.3.1

### Patch Changes

- Updated dependencies [[`7df75e6`](https://github.com/DevinoSolutions/upup/commit/7df75e6b430e080bf8f3931297ec171d86ff19ce), [`e4393b5`](https://github.com/DevinoSolutions/upup/commit/e4393b5652add229c9d5fa849cba2ba97913f7cf), [`db9ea90`](https://github.com/DevinoSolutions/upup/commit/db9ea90af5b1916763d607baee81e118b6d7c718), [`720d273`](https://github.com/DevinoSolutions/upup/commit/720d2735d268b242338b70afa380161cf7107036)]:
    - @useupup/core@3.3.1

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

- Updated dependencies [[`5fbd2c6`](https://github.com/DevinoSolutions/upup/commit/5fbd2c671a1834cd8e884bda455eb5602480f829), [`8446ca0`](https://github.com/DevinoSolutions/upup/commit/8446ca0c8ad26e2a1704a2d8bd11fc306c434f5d), [`03b4e82`](https://github.com/DevinoSolutions/upup/commit/03b4e82baed0d751ba5da688715ef48748e7fe51)]:
    - @useupup/core@3.3.0

## 3.2.0

### Minor Changes

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

### Patch Changes

- Updated dependencies [[`de8b363`](https://github.com/DevinoSolutions/upup/commit/de8b3635a1eafa04c378a5f5af14e22ba99b3fe5), [`de8b363`](https://github.com/DevinoSolutions/upup/commit/de8b3635a1eafa04c378a5f5af14e22ba99b3fe5), [`ff8f74f`](https://github.com/DevinoSolutions/upup/commit/ff8f74fd5cd33525b491267b986d566e3e1d8b5b), [`da08e45`](https://github.com/DevinoSolutions/upup/commit/da08e45fe49df4824a134b69498dff223b883701), [`5597477`](https://github.com/DevinoSolutions/upup/commit/5597477e29ad970f249b3a6b7b4912495e8a0503)]:
    - @useupup/core@3.2.0

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

### Patch Changes

- Updated dependencies [[`79a2861`](https://github.com/DevinoSolutions/upup/commit/79a2861ffc6259485075ac54c85c564fd58c7b86)]:
    - @useupup/core@3.1.0
