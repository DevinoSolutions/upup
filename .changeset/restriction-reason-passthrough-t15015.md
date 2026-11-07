---
'@useupup/core': minor
'@useupup/react': minor
'@useupup/preact': minor
'@useupup/vue': minor
'@useupup/svelte': minor
'@useupup/angular': minor
'@useupup/vanilla': minor
---

A refused file is now reported with the reason core gave it, once, and no longer costs the rest of its batch.

- `onRestrictionFailed` receives `UpupValidationError.reason` instead of a reason guessed from the message text, so a file named `Unlimited_CV.pdf` that is too large reports `FILE_TOO_LARGE` (not `LIMIT_EXCEEDED`) and an over-total batch reports the new `'TOTAL_SIZE_EXCEEDED'` (previously `FILE_TOO_LARGE`). `onFileTypeMismatch`, `onRestrictionFailed` and `onError` fire once per refused file, each with that file.
- `core.setFiles()` now emits `restriction-failed` for a refusal, and `core.addFiles()` / `core.setFiles()` emit it for refusals only: an ordinary error (a throwing `onBeforeFileAdded`) no longer masquerades as a restriction failure.
- One failed upload calls `onError` once. The batch summary that follows the per-file error ("1 file upload(s) failed") no longer reaches `onError` when every file in it was already reported. The raw `upload-error` event keeps its documented two emissions.
- A mixed batch (say `.zip`, `.exe` and a valid `.png` dropped together) queues the acceptable files and reports each refused one separately, in `addFiles` and `setFiles` alike. Type and size are judged per file; the count limit and `maxTotalFileSize` still judge the acceptable remainder as a unit, exactly as before. `addFiles` / `setFiles` still reject, with the first refusal, when **every** file in the batch is refused; a batch with at least one acceptable file now resolves instead of rejecting.

This is a minor, not a major: no export, option or event was removed, and the one observable change (a partly acceptable batch now resolves) fixes a whole-batch rejection that dropped valid files. The `onRestrictionFailed` reason union gains `'TOTAL_SIZE_EXCEEDED'`, and `UpupCore.addFiles` takes an optional third `hooks` argument (`{ onRefused }`).
