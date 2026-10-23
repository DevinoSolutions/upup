---
'@useupup/core': patch
'@useupup/server': patch
'@useupup/react': patch
'@useupup/vue': patch
'@useupup/svelte': patch
'@useupup/angular': patch
'@useupup/vanilla': patch
---

Server-mode cloud-drive transfers now show up as a completed file row ("Upload complete") instead of resetting to the empty dropzone, and the server-mode drive view gains the same Log out control as client mode. New `POST /files/:provider/logout` route on `@useupup/server` drops only the caller's stored tokens for that provider.

`UpupCore.addTransferredFile` is a deliberate public method: it registers an already-stored file (a server-mode drive transfer) as a completed row, honouring the same `limit` / size / type / duplicate restrictions as `addFiles` and firing `onUploadComplete` once the batch is complete. `UpupCore.checkTransferredFile` runs those checks without registering anything (the drive view uses it to refuse a file before the server round-trip).
