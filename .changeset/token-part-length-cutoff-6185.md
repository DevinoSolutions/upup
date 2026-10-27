---
'@useupup/server': patch
---

Upload tokens now must carry a signed part size (`ps`) and issue time (`iat`); `verifyUploadToken` refuses any other with `403 { "code": "malformed" }` on every continuation route (`/multipart/sign-part`, `/complete`, `/abort`, `/resume`). The first release carrying this refuses upload tokens minted by `@useupup/server` 3.3.5 and earlier (no signed part size), and the `exp - TTL` fallback for tokens without `iat` is gone. Uploads in flight during the upgrade must restart: sign-part/complete/abort fail `403 malformed` (token TTL is at most 1 h), and persisted resume sessions (default `multipartResumeWindowSeconds` 24 h) are dropped by the client, which falls back to a fresh `/multipart/init`. Operators: keep an incomplete-multipart-upload lifecycle rule on the bucket, because legacy uploads can no longer be aborted through the API.
