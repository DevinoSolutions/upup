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

- `onRestrictionFailed` receives `UpupValidationError.reason` instead of a reason guessed from the message text, so a file named `Unlimited_CV.pdf` that is too large reports `FILE_TOO_LARGE` (not `LIMIT_EXCEEDED`) and an over-total batch reports the new `'TOTAL_SIZE_EXCEEDED'` (previously `FILE_TOO_LARGE`). `onFileTypeMismatch`, `onRestrictionFailed` and `onError` fire once per refused file, each with that file. **That means `onError` now fires once per refused file**: a drop of three refused files calls `onError` three times with three messages (an app that shows a toast per call shows three toasts), where it used to fire once for the whole batch.
- `core.setFiles()` now emits `restriction-failed` for a refusal, and `core.addFiles()` / `core.setFiles()` emit it for refusals only: an ordinary error (a throwing `onBeforeFileAdded`) no longer masquerades as a restriction failure.
- One failed upload calls `onError` once. The batch summary that follows the per-file error ("1 file upload(s) failed") no longer reaches `onError` when every file in it was already reported. The raw `upload-error` event keeps its documented two emissions.
- Refusals are reported the same way on every route that admits files: the picker and drop, the `uploadFiles` and `replaceFiles` ref commands, and the re-add that follows `onPrepareFiles`. `uploadFiles` uploads the acceptable files and reports each refused one; `replaceFiles` keeps the current selection and its previews when every file is refused. `core.setFiles()` takes the same optional `hooks` argument as `addFiles()`, and a host callback that throws inside `hooks.onRefused` no longer rejects an add that already committed files (it is warned about in development and the remaining refusals are still reported).
- A mixed batch (say `.zip`, `.exe` and a valid `.png` dropped together) queues the acceptable files and reports each refused one separately, in `addFiles` and `setFiles` alike. Type and size are judged per file; the count limit and `maxTotalFileSize` still judge the acceptable remainder as a unit, exactly as before. `addFiles` / `setFiles` still reject, with the first refusal, when **every** file in the batch is refused; a batch with at least one acceptable file now resolves instead of rejecting.

This is a minor, not a major: no export, option or event was removed, and the one observable change (a partly acceptable batch now resolves) fixes a whole-batch rejection that dropped valid files. The `onRestrictionFailed` reason union gains `'TOTAL_SIZE_EXCEEDED'`, `UpupCore.addFiles` takes an optional third `hooks` argument (`{ onRefused }`) and `UpupCore.setFiles` an optional second one, and the `AddFilesHooks` type is exported from `@useupup/core`.

One type-level consequence worth knowing: an app that annotates the `onRestrictionFailed` callback's `reason` parameter with the old four-value union (`'TYPE_MISMATCH' | 'FILE_TOO_LARGE' | 'FILE_TOO_SMALL' | 'LIMIT_EXCEEDED'`) now gets a type error under `strictFunctionTypes`, because the callback can receive `'TOTAL_SIZE_EXCEEDED'`. Widen the annotation (or drop it and let it infer) to fix it.
