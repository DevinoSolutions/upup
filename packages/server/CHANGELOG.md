# @useupup/server

## 3.4.0

### Minor Changes

- [#655](https://github.com/DevinoSolutions/upup/pull/655) [`852fcec`](https://github.com/DevinoSolutions/upup/commit/852fcec88e97e49e305d6489fd6cf2d7170cc3e5) Thanks [@AminDhouib](https://github.com/AminDhouib)! - The drive transfer route (`POST /files/:provider/transfer`) now returns 400 `Invalid mimeType` when no `allowedTypes` is configured and the request body's `mimeType` is present but not a string (including `null`). With `allowedTypes` configured, a non-string `mimeType` is still refused with 415 first. Previously, with no `allowedTypes`, a non-string value (e.g. `123`, `{}`, `[]`, `null`) flowed through to the S3 `ContentType`. An absent `mimeType` is unchanged and still falls back to the provider-reported type.

- [#651](https://github.com/DevinoSolutions/upup/pull/651) [`6138e55`](https://github.com/DevinoSolutions/upup/commit/6138e55e79901c2a1ae2ec0d39b5f1d66fb54c78) Thanks [@AminDhouib](https://github.com/AminDhouib)! - A server-mode drive transfer no longer stores a file the uploader would then refuse. The UI sends the uploader's `maxFileSize` and accepted types (`restrictions`) with `POST /files/:provider/transfer`, and `@useupup/server` applies them as an additional tightening only: effective cap = min(server cap, client cap), the provider-reported size and type are checked before streaming (`413` / `415`, nothing stored), and a client value can never loosen the server policy. Size and type violations are now refused before anything is stored, so they leave no orphan object. Also: the batch report counts only files that really registered (never an empty list), and angular reports the finished selection after `onBack`, like the other frameworks.

- [#613](https://github.com/DevinoSolutions/upup/pull/613) [`81ad969`](https://github.com/DevinoSolutions/upup/commit/81ad969ede8f3c7cc39d26e9829616b7c818c4a1) Thanks [@AminDhouib](https://github.com/AminDhouib)! - Bind the cloud-drive OAuth callback to the browser that started the flow. `/auth/:provider` now sets a short-lived `HttpOnly` nonce cookie (over https `__Host-upup_oauth_<provider>`, Path=/, Secure; over plain http `upup_oauth_<provider>` scoped to the `/cb` path) and `/auth/:provider/cb` returns 403 `AUTH_DENIED` unless the request carries the matching cookie, so a victim can no longer be walked through an attacker-started flow that saves their Drive tokens under the attacker's user. Flows in flight during the upgrade must be restarted, and browsers must accept cookies on the server's origin. `writeWebResponse` also emits every `Set-Cookie` value when the sink provides `appendHeader`.

- [#647](https://github.com/DevinoSolutions/upup/pull/647) [`b43d7e1`](https://github.com/DevinoSolutions/upup/commit/b43d7e10ca65a4baf3c150b1a4c2c94989cb4f95) Thanks [@AminDhouib](https://github.com/AminDhouib)! - Server-mode cloud-drive transfers now show up as a completed file row ("Upload complete") instead of resetting to the empty dropzone, and the server-mode drive view gains the same Log out control as client mode. New `POST /files/:provider/logout` route on `@useupup/server` drops only the caller's stored tokens for that provider.

    `UpupCore.addTransferredFile` is a deliberate public method: it registers an already-stored file (a server-mode drive transfer) as a completed row, honouring the same `limit` / size / type / duplicate restrictions as `addFiles` and emitting `upload-success` per file. The drive view reports each finished selection once with `upload-all-complete` (the completed files, the same payload a normal run passes), so `onUploadComplete` fires once per transferred batch. An unknown listed size/type is not treated as a violation; if the real stored size/type then breaks a restriction the row is refused and the view shows the reason (size and type are refused by the server before storing, so a stored object can still be left behind by rules the server never sees, such as a below-minimum file size or maxTotalFileSize (an unknown listed size passes the pre-flight check), or by a maxFiles or duplicate conflict that arises while the transfer is in flight). `UpupCore.checkTransferredFile` runs those checks without registering anything (the drive view uses it to refuse a file before the server round-trip).

- [#665](https://github.com/DevinoSolutions/upup/pull/665) [`4b19826`](https://github.com/DevinoSolutions/upup/commit/4b1982686af1aca8a886641b0f38cb6ebf31f421) Thanks [@AminDhouib](https://github.com/AminDhouib)! - A failed OAuth token exchange in `GET /auth/:provider/cb` is now mapped per cause instead of always answering `502`. When the provider rejected the authorization code or your OAuth app (a provider `4xx` other than `408`/`429`, or an OAuth `error` in a `200` body) the route answers `424` (Failed Dependency): retrying cannot help: an expired or reused code needs a fresh sign-in, and a rejected app needs its client id, secret or redirect URI fixed first. When the provider was unreachable or timed out, answered `5xx`/`429`/`408` or another non-`4xx` error, or sent a malformed `200` (no token and no error, or a body that is not JSON, which used to escape as a generic `500`), it answers `502`: the failure is on the provider's side and signing in again may work. The callback URL itself is never replayable in either case. The `{ error, code: 'AUTH_PROVIDER_ERROR' }` body, the `x-upup-request-id` header and the cleared nonce cookie are unchanged. A `424` also passes through Cloudflare, which replaces an origin `502` with its own plain-text page. Clients that matched on `502` for this route should also handle `424`, or match the `AUTH_PROVIDER_ERROR` code.

- [#643](https://github.com/DevinoSolutions/upup/pull/643) [`7d9fb8f`](https://github.com/DevinoSolutions/upup/commit/7d9fb8fa9736413aee197b49724d015b094efbcb) Thanks [@AminDhouib](https://github.com/AminDhouib)! - Server hardening. `Vary: Origin` is now sent on every response whenever `cors` is configured, including replies to a disallowed or missing origin, so a shared cache cannot hand a header-less reply to an allowed origin. `/multipart/complete` answers 400 (not 500) when `parts` is not an array of `{ partNumber, eTag }`; the check runs after the token checks, so a forged token is still 403. `/presign` and `/multipart/init` now require `size` to be an integer.

- [#617](https://github.com/DevinoSolutions/upup/pull/617) [`444ab01`](https://github.com/DevinoSolutions/upup/commit/444ab0169cd7a0f71d3a02f7ce65e9691f11cefa) Thanks [@AminDhouib](https://github.com/AminDhouib)! - Drive transfers now gate and store the type the cloud provider reports instead of the client's `mimeType` claim, re-check it against `allowedTypes`, and run `hooks.onBeforeUpload` before any bytes are written.

    Multipart part URLs now sign the exact expected part length (derived from the signed size envelope and part size), so storage rejects an oversized or undersized part at upload time; `sign-part` refuses a part number the file does not have. The complete-time envelope check stays.

    There is no grace period. No earlier release signed or relaxed the part length, so the binding applies from the moment you upgrade.

    Part-length binding is now mandatory for multipart upload tokens: `verifyUploadToken` requires the signed part size (`ps`) and issue time (`iat`), and refuses any token without them with `403 { "code": "malformed" }` on `/multipart/sign-part`, `/complete`, `/abort` and `/resume`. Tokens minted by `@useupup/server` 3.3.5 and earlier (no signed part size) are refused, and the `exp - TTL` fallback for tokens without `iat` is gone. Upgrade the server first, then let clients retry. Uploads in flight during the upgrade restart: sign-part/complete/abort fail `403 malformed` (token TTL is at most 1 h; the user just retries, no code change), and persisted resume sessions (default `multipartResumeWindowSeconds` 24 h) are dropped by the client, which falls back to a fresh `/multipart/init`. Keep an incomplete-multipart-upload lifecycle rule on the bucket, because legacy uploads can no longer be aborted through the API.

### Patch Changes

- [#658](https://github.com/DevinoSolutions/upup/pull/658) [`cc4d305`](https://github.com/DevinoSolutions/upup/commit/cc4d30563da38aeb2e259e3b2216421227c95814) Thanks [@AminDhouib](https://github.com/AminDhouib)! - A drive transfer rejected after the provider download had started (the provider's real size over the cap, a client `accept` mismatch, a type outside `allowedTypes`, a refusing `onBeforeUpload`, or a failed transfer) now answers immediately with the same 413/415/403/500. Releasing the open drive stream is no longer awaited, so a download stream whose `cancel()` is slow or never settles can no longer leave the request hanging.

- [#623](https://github.com/DevinoSolutions/upup/pull/623) [`3b67b9d`](https://github.com/DevinoSolutions/upup/commit/3b67b9d8d3bfa3d1f3d9b292b94d8dbc9d55853b) Thanks [@AminDhouib](https://github.com/AminDhouib)! - OAuth and input hardening. The OAuth nonce cookie is now `__Host-upup_oauth_<provider>` (Path=/, Secure, no Domain) over https, so a sibling subdomain cannot toss it; plain http keeps the old name and `/cb` path. `/cb` accepts a match from any same-named cookie, and clears the nonce cookie on every exit, not only success. The Fastify and Next Pages adapters now deliver several `Set-Cookie` headers instead of keeping only the last. A JSON body that is not an object is a 400 instead of a 500, an upload token with extra segments is rejected, the `/health` storage probe cache is per destination, and the token-exchange and refresh calls have a timeout and refuse a response with no `access_token`.

- Updated dependencies [[`ff775a4`](https://github.com/DevinoSolutions/upup/commit/ff775a421c8b35bc244f4bea76346557bff4d884), [`6138e55`](https://github.com/DevinoSolutions/upup/commit/6138e55e79901c2a1ae2ec0d39b5f1d66fb54c78), [`a26732a`](https://github.com/DevinoSolutions/upup/commit/a26732ae8d5835c6d25ecebdf4a96c960319b0ac), [`023276e`](https://github.com/DevinoSolutions/upup/commit/023276e205bd094c44871b3ef6a91191c6bc46a7), [`eb4fadf`](https://github.com/DevinoSolutions/upup/commit/eb4fadfd8090f6f780fda5d93f9bee6410dea957), [`c20db76`](https://github.com/DevinoSolutions/upup/commit/c20db7659e639a7ff50cca0eee010daaa560455c), [`b43d7e1`](https://github.com/DevinoSolutions/upup/commit/b43d7e10ca65a4baf3c150b1a4c2c94989cb4f95)]:
    - @useupup/core@3.4.0

## 3.3.5

### Patch Changes

- Updated dependencies []:
    - @useupup/core@3.3.5

## 3.3.4

### Patch Changes

- Updated dependencies [[`4f9324d`](https://github.com/DevinoSolutions/upup/commit/4f9324d9ee3c63238b0d9478fa21110ad390b734)]:
    - @useupup/core@3.3.4

## 3.3.3

### Patch Changes

- Updated dependencies [[`bf817fc`](https://github.com/DevinoSolutions/upup/commit/bf817fc1bf57b56cc4ca7e6e11209a6ab4429f4d)]:
    - @useupup/core@3.3.3

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
