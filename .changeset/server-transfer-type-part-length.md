---
'@useupup/server': patch
---

Drive transfers now gate and store the type the cloud provider reports instead of the client's `mimeType` claim, re-check it against `allowedTypes`, and run `hooks.onBeforeUpload` before any bytes are written. Multipart part URLs now sign the exact expected part length (derived from the signed size envelope and part size), so storage rejects an oversized or undersized part at upload time; `sign-part` refuses a part number the file does not have. The complete-time envelope check stays.
