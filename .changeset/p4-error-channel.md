---
'@useupup/server': minor
'@useupup/core': minor
'@useupup/react': minor
'@useupup/vue': minor
'@useupup/svelte': minor
'@useupup/vanilla': minor
'@useupup/angular': minor
'@useupup/preact': minor
'@useupup/next': minor
---

## Server + client error channel

Every non-2xx server-mode response now returns a structured
`{ error: <generic message>, code: <machine code> }` body instead of
leaking raw internal error text, and every server error is routed
through a pluggable `UpupServerLogger` seam (`onError` /
`reportServerError`) so hosts can observe failures without scraping
stdout. A new `GET /health` route reports storage reachability
(`@useupup/server` `handleHealth`).

Client-side, upload failures now carry the machine `code` alongside
the human message: `OrchestratorState.uploadErrorCode`,
`BaseContextUpload.uploadErrorCode`, and a new
`UpupError.status`/`BAD_REQUEST` code. Response bodies are parsed via
`parseErrorBody()`/`uploadErrorFromResponse()` instead of being
discarded, and `errorCodeToMessageKey()` maps machine codes onto the
existing i18n catalog for code-aware messages
(`uploadFailedWithCode`).

All six UI packages (react, vue, svelte, vanilla, angular; preact
inherits via its react re-export) render a new default failure
element in the file-list footer:
`data-testid="upup-upload-error"` / `data-upup-slot="upload-error"`.
This is an additive DOM-contract hook — allowed under the N4 freeze,
which covers renames only.
