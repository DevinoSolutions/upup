---
'@upupjs/core': patch
---

`IndexedDBStorage` (crash recovery) now holds one cached IndexedDB connection
for its lifetime instead of opening and closing the database around every
operation. Firefox ties Blob/File handles read from IndexedDB to the
connection they were read over: closing it right after the crash-recovery
restore invalidated the revived File's backing store, and mid-resume slice
reads rejected with `AbortError` — a Firefox-only reload-resume stall
(Chromium materializes IndexedDB blobs independently and was unaffected).
Keeping the connection open keeps the revived File readable for the whole
resume. The cached connection still yields to the rest of the browser: a
`versionchange` (e.g. `deleteDatabase` from another tab) closes and releases
it, and a browser-initiated `close` makes the next operation reopen cleanly.
