---
'@useupup/core': patch
---

Overlapping `addFiles()` / `setFiles()` calls are now admitted one at a time, so each batch is judged against the selection the previous one left behind. Previously two calls fired without awaiting each other both passed `maxFiles` / `maxTotalFileSize` checks against the same stale selection and could exceed them, or admit identical content twice with `contentDeduplication` on.
