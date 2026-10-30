---
'@useupup/server': minor
---

Drive transfers now gate and store the type the cloud provider reports instead of the client's `mimeType` claim, re-check it against `allowedTypes`, and run `hooks.onBeforeUpload` before any bytes are written.

Multipart part URLs now sign the exact expected part length (derived from the signed size envelope and part size), so storage rejects an oversized or undersized part at upload time; `sign-part` refuses a part number the file does not have. The complete-time envelope check stays.

There is no grace period. No earlier release signed or relaxed the part length, so the binding applies from the moment you upgrade.

Part-length binding is now mandatory for multipart upload tokens: `verifyUploadToken` requires the signed part size (`ps`) and issue time (`iat`), and refuses any token without them with `403 { "code": "malformed" }` on `/multipart/sign-part`, `/complete`, `/abort` and `/resume`. Tokens minted by `@useupup/server` 3.3.5 and earlier (no signed part size) are refused, and the `exp - TTL` fallback for tokens without `iat` is gone. Upgrade the server first, then let clients retry. Uploads in flight during the upgrade restart: sign-part/complete/abort fail `403 malformed` (token TTL is at most 1 h; the user just retries, no code change), and persisted resume sessions (default `multipartResumeWindowSeconds` 24 h) are dropped by the client, which falls back to a fresh `/multipart/init`. Keep an incomplete-multipart-upload lifecycle rule on the bucket, because legacy uploads can no longer be aborted through the API.
