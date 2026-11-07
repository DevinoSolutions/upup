---
'@useupup/vue': patch
'@useupup/svelte': patch
'@useupup/angular': patch
---

Callbacks set or changed after mount now take effect, including the refusal callbacks (`onError`, `onRestrictionFailed`, `onFileTypeMismatch`). Vue and Svelte read every callback once at setup, so a handler that arrived later was never heard and the first one kept firing; Angular's `UpupStore` kept the callbacks it captured at `init()` when `setConfig()` was called again. Angular also reported a whole-run failure (for example no upload target) to `onError` twice; it now reports it once.
