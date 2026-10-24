---
'@useupup/core': patch
'@useupup/server': patch
'@useupup/react': patch
'@useupup/vue': patch
'@useupup/svelte': patch
'@useupup/angular': patch
'@useupup/vanilla': patch
---

A server-mode drive transfer no longer stores a file the uploader would then refuse. The UI sends the uploader's `maxFileSize` and accepted types (`restrictions`) with `POST /files/:provider/transfer`, and `@useupup/server` applies them as an additional tightening only: effective cap = min(server cap, client cap), the provider-reported size and type are checked before streaming (`413` / `415`, nothing stored), and a client value can never loosen the server policy. This supersedes the "stored object is not deleted" note of the previous drive-row change for the size and type cases. Also: the batch report counts only files that really registered (never an empty list), and angular reports the finished selection after `onBack`, like the other frameworks.
