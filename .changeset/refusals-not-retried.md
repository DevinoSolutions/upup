---
'@useupup/core': patch
---

A 4xx answer is no longer retried, whichever error class carries it: a 403 from the server's `onBeforeUpload` hook on `/presign` or `/multipart/init` reaches `onError` after one request instead of four. 408 and 429 are now retried, as are 5xx and network failures as before.
