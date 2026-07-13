---
'@useupup/server': minor
'@useupup/core': minor
---

## Trust posture: secure-by-default uploads, uid enforcement, bounded transfer

`@useupup/server` upload routes (`POST /presign`, `POST /multipart/init`) now
reject anonymous callers by default with `403 { code: 'AUTH_REQUIRED' }`
unless `auth`, `getUserId`, or the new opt-in `allowAnonymousUploads: true`
is configured. This is a breaking change for any deployment relying on the
previous open-by-default behavior with none of those configured.

The multipart continuation routes (`/multipart/sign-part`,
`/multipart/complete`, `/multipart/abort`) now re-check the caller's resolved
identity against the upload token's bound `uid` whenever `getUserId` is
configured — a mismatch returns `403 { code: 'AUTH_DENIED' }`. Deployments
with no `getUserId` resolver are unaffected: token possession remains the
model there, by design.

The server→S3 drive-transfer path now bounds its per-request buffered memory
to a fixed 5 MB (`SINGLE_PUT_MAX_BYTES`), regardless of file size — files
above that size stream through the existing bounded multipart path instead
of being buffered whole. The configurable `multipartThreshold` config field
and `DEFAULT_MULTIPART_THRESHOLD` export are **removed**; memory safety is no
longer a raisable knob.

New `UpupErrorCode.AUTH_REQUIRED` (additive enum member) on `@useupup/core`.

See `packages/server/README.md` for the new `allowAnonymousUploads` config
note and a "Token semantics: TTL & replay" section documenting the upload
token's replay window and its bounds.
