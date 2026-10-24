---
'@useupup/server': patch
---

The drive transfer route (`POST /files/:provider/transfer`) now returns 400 `Invalid mimeType` when the request body's `mimeType` is present but not a string. Previously, with no `allowedTypes` configured, a non-string value (e.g. `123`, `{}`, `[]`) flowed through to the S3 `ContentType`. An absent `mimeType` is unchanged and still falls back to the provider-reported type.
