---
'@useupup/server': patch
---

The drive transfer route (`POST /files/:provider/transfer`) now returns 400 `Invalid mimeType` when no `allowedTypes` is configured and the request body's `mimeType` is present but not a string (including `null`). With `allowedTypes` configured, a non-string `mimeType` is still refused with 415 first. Previously, with no `allowedTypes`, a non-string value (e.g. `123`, `{}`, `[]`, `null`) flowed through to the S3 `ContentType`. An absent `mimeType` is unchanged and still falls back to the provider-reported type.
