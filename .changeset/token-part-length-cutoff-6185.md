---
'@useupup/server': patch
---

Upload tokens minted before part-length binding are now refused. `verifyUploadToken` requires the signed part size (`ps`), so a validly signed token without it gets `403 { "code": "malformed" }` on every continuation route (`/multipart/sign-part`, `/complete`, `/abort` and `/resume`) instead of falling back to the complete-time envelope check. This closes the compatibility window that opened with per-part length signing (T-5492) and ended 2026-10-28; those tokens live one hour and resume inside `multipartResumeWindowSeconds`, so only an operator who widened that window can have uploads in flight that must be restarted.
