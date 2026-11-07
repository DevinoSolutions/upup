---
'@useupup/vue': patch
'@useupup/svelte': patch
'@useupup/angular': patch
---

The uploader callbacks (`onError`, `onWarn`, the upload start, progress and complete callbacks, `onFilesSelected`, `onFileRemoved`, `onStatusChange`, `onDoneClicked`, `onPrepareFiles`, and the refusal callbacks `onRestrictionFailed` and `onFileTypeMismatch`) set or changed after mount now take effect. `onBeforeFileAdded` and `onFileProcessed` are covered by their own entry. Vue and Svelte read every callback once at setup, so a handler that arrived later was never heard and the first one kept firing; Angular's `UpupStore` kept the callbacks it captured at `init()` when `setConfig()` was called again. Angular also reported a whole-run failure (for example no upload target) to `onError` twice; it now reports it once.
