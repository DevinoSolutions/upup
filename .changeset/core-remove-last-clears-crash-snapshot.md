---
'@useupup/core': patch
---

Removing the last file one at a time (or calling `setFiles([])`) now clears the crash-recovery snapshot, like `removeAll()` already did. Previously the discarded file came back, paused, on the next reload.
