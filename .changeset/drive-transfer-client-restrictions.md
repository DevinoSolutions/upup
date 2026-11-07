---
'@useupup/core': minor
'@useupup/server': minor
'@useupup/react': minor
'@useupup/vue': minor
'@useupup/svelte': minor
'@useupup/angular': minor
'@useupup/vanilla': minor
---

A server-mode drive transfer no longer stores a file the uploader would then refuse. The UI sends the uploader's `maxFileSize` and accepted types (`restrictions`) with `POST /files/:provider/transfer`, and `@useupup/server` applies them as an additional tightening only: effective cap = min(server cap, client cap), the provider-reported size and type are checked before streaming (`413` / `415`, nothing stored), and a client value can never loosen the server policy. Size and type violations are now refused before anything is stored, so they leave no orphan object. Also: the batch report counts only files that really registered (never an empty list), and angular reports the finished selection after `onBack`, like the other frameworks.
