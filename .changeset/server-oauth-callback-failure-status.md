---
'@useupup/server': patch
---

A failed OAuth token exchange in `GET /auth/:provider/cb` is now mapped per cause instead of always answering `502`. When the provider rejected the authorization code or your OAuth app (a provider `4xx`, or an OAuth `error` in a `200` body) the route answers `424` (Failed Dependency): retrying cannot succeed until the user signs in again or the app's client id, secret or redirect URI is fixed. When the provider was unreachable, timed out, answered `5xx`/`429`/`408`, or sent a `200` with no token, it still answers `502`, which is safe to retry. The `{ error, code: 'AUTH_PROVIDER_ERROR' }` body, the `x-upup-request-id` header and the cleared nonce cookie are unchanged. A `424` also passes through Cloudflare, which replaces an origin `502` with its own plain-text page. Clients that matched on `502` for this route should also handle `424`, or match the `AUTH_PROVIDER_ERROR` code.
