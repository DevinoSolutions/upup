---
'@useupup/core': patch
---

A multipart part whose `ETag` response header is not readable now fails at once with an `UpupStorageError` (code `CORS_ERROR`) that says to add `ETag` to the bucket's CORS `ExposeHeaders`. Previously the client sent a made-up ETag and `multipart/complete` failed with an unrelated storage error.
