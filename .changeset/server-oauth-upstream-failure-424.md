---
'@useupup/server': patch
---

A failed OAuth token exchange in `GET /auth/:provider/cb` (the provider rejected the code, answered without an `access_token`, or was unreachable) now answers `424` instead of `502`. Behind Cloudflare an origin `502`/`504` is replaced by Cloudflare's own plain-text `error code: 502` page, so the JSON body, the `AUTH_PROVIDER_ERROR` code and the `x-upup-request-id` header never reached the client and a provider misconfiguration looked like a Cloudflare outage. The body, code, request id and cleared nonce cookie are unchanged. Clients that matched on the status `502` for this route must match `424` (or the `AUTH_PROVIDER_ERROR` code).
