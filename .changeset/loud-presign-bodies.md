---
'@upupjs/core': patch
---

A custom `uploadEndpoint`'s presign failures now carry the endpoint's own error
body. `TokenEndpointCredentials.getPresignedUrl` threw
`Presign request failed: <status> <statusText>` without ever reading a non-ok
response, so the sentence the endpoint wrote for the user — a plan-limit
message, an expired-session notice — was discarded before any handler saw it,
and the only way to recover it was to match the HTTP status out of upup's own
message text. The strategy now reads the body and builds the error through
`uploadErrorFromResponse`, the same helper the direct-PUT, multipart, server
credentials and drive-transfer strategies already use: the body's message
becomes `error.message` (what `onError` receives), a `code` field lands on
`error.code`, and `error.status` still carries the HTTP status.

Backward compatible: the thrown class is still `UpupNetworkError`, and when the
body is empty or unreadable the message is byte-identical to before, so a
consumer matching on the old wording is unaffected. Nothing in the public
`onError` signature changes.

`parseErrorBody` also stops discarding a valid `message` when a non-string
`error` field sits beside it — a `{ message, error: true }` body used to fall
all the way through to the raw-JSON text fallback.
