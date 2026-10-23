---
'@useupup/server': patch
'@useupup/next': patch
---

OAuth and input hardening. The OAuth nonce cookie is now `__Host-upup_oauth_<provider>` (Path=/, Secure, no Domain) over https, so a sibling subdomain cannot toss it; plain http keeps the old name and `/cb` path. `/cb` accepts a match from any same-named cookie, and clears the nonce cookie on every exit, not only success. The Fastify and Next Pages adapters now deliver several `Set-Cookie` headers instead of keeping only the last. A JSON body that is not an object is a 400 instead of a 500, an upload token with extra segments is rejected, the `/health` storage probe cache is per destination, and the token-exchange and refresh calls have a timeout and refuse a response with no `access_token`.
