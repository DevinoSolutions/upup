---
'@useupup/core': patch
---

An upload finished by `resume()` now emits `upload-all-complete`, so `onFilesUploadComplete` runs. Previously an upload that resumed after a network drop or a pause stored its bytes and reported `SUCCESSFUL`, but the completion event never fired and the host app never received the file's key.
