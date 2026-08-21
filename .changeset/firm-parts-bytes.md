---
'@upupjs/core': patch
---

Multipart part PUTs now materialize each slice to an ArrayBuffer before
`xhr.send`, instead of handing XHR a lazy Blob reference. Firefox streams Blob
bodies lazily during send, and when the Blob is a slice of a File revived from
IndexedDB after a page reload (crash-recovery resume), that lazy read could
stall — headers went out, the body never followed, and the storage backend
timed the part out as a 503 storm. Reading the bytes up front turns a broken
source into a clean, retryable failure: a read rejection (e.g. Firefox
`NotReadableError`) burns one `retryDelays` slot and re-reads the slice fresh,
a read that never settles is cut off by its own `partTimeoutMs` deadline
(a separate window from the PUT's inactivity watchdog, which starts fresh
after the read), and aborting the upload cancels an in-flight read
immediately. Materialization is capped at 16 MiB per part — larger parts
(part size scales with file size past ~48 GiB via the 10,000-part clamp) keep
the streaming Blob path, so transient memory is bounded by
`maxConcurrentParts × min(partSize, 16 MiB)` (plus XHR's own copy of the
buffer while sending).
