---
'@useupup/core': patch
'@useupup/vanilla': patch
---

Three refusal-callback fixes. `onFileTypeMismatch` now receives the accept list core actually enforced at refusal time, so it is no longer the empty string after `allowedFileTypes` changes post-mount (React syncs that option on every props change). A throwing host callback passed to core's per-call refusal hook is now reported in every environment instead of only warning in development: through `globalThis.reportError` where it exists (browsers, so it reaches `window.onerror` and error reporters) and through `console.error` otherwise (Node, SSR); it still never rejects the add and never skips the remaining refusals. `@useupup/vanilla`'s `createUploader` options now type `onRestrictionFailed` and `onFileTypeMismatch`, which the shared controller already honoured at runtime.
