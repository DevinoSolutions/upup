---
'@useupup/server': patch
---

Bump `@aws-sdk/s3-request-presigner` to `^3.1135.0` so it moves in lockstep with `@aws-sdk/client-s3`. Mismatched versions of the two packages give `getSignedUrl` incompatible `S3Client` types.
