---
'@upupjs/core': minor
'@upupjs/server': minor
---

Server-mode multipart uploads now survive a page reload, a tab close, or a
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
