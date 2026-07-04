---
"@upup/core": minor
"@upup/angular": minor
"@upup/vanilla": minor
---

## Core state/event contract

The `@upup/core` state and event surface is now an explicit, single-source
contract:

- **One upload-failure event.** The bare `'error'` core event is retired;
  every upload failure — upload, retry, and resume — is reported through
  `upload-error`. The HEIC pipeline-step diagnostic moves to `pipeline-error`.
  A consumer's event listener throwing is isolated in `EventEmitter.emit`
  (reported dev-only, never re-emitted) so a render bug can no longer be
  misattributed as an upload failure.
- **Terminal `destroy()`.** After `destroy()`, the run/mutation entry points
  (`upload`/`resume`/`retry`/`addFiles`/`setFiles`) throw; the `crashRecovery`
  and `pipelineEngine` manager references are released. Crash-recovery storage
  is preserved and the `files`/`progress` getters keep working post-destroy.
- **Immutable file state.** File status/key/metadata transitions go through
  `FileManager.updateFile`, which produces a new `UploadFile` reference instead
  of mutating in place, so the orchestrator's identity-diff projection tracks
  every transition.
- **Single-source `uploadStatus`.** The orchestrator projects `uploadStatus`
  from core's `state-change` events rather than three divergent listeners, so
  pause/resume/cancel now stay consistent (no stale `SUCCESSFUL` over an empty
  list after cancel).
- **Single-flight runs.** Concurrent `upload`/`retry` share one in-flight run
  and a mid-run `resume` is a no-op, so double-clicks and auto-upload races no
  longer spawn competing upload managers.
- **Live pipeline flags.** Toggling an auto-pipeline flag
  (`heicConversion`/`stripExifData`/`imageCompression`/`thumbnailGenerator`/
  `checksumVerification`) via `updateOptions` rebuilds the auto-pipeline on the
  next upload; an explicit `pipeline` stays construction-only.

`@upup/angular` (`@Output() error`) and `@upup/vanilla` (the `upup:error` DOM
custom event) now source `upload-error`, so their public error surfaces fire
for every upload failure — not just the previously-unreachable resume path.
Their public names are unchanged; the angular `error` output payload gains an
optional `file` field.
