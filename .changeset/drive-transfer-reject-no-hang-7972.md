---
'@useupup/server': patch
---

A drive transfer rejected after the provider download had started (the provider's real size over the cap, a client `accept` mismatch, a type outside `allowedTypes`, a refusing `onBeforeUpload`, or a failed transfer) now answers immediately with the same 413/415/403/500. Releasing the open drive stream is no longer awaited, so a download stream whose `cancel()` is slow or never settles can no longer leave the request hanging.
