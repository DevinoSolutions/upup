---
'@useupup/server': patch
'@useupup/next': patch
---

Server hardening. `Vary: Origin` is now sent on every response whenever `cors` is configured, including replies to a disallowed or missing origin, so a shared cache cannot hand a header-less reply to an allowed origin. `/multipart/complete` answers 400 (not 500) when `parts` is not an array of `{ partNumber, eTag }`; the check runs after the token checks, so a forged token is still 403. `/presign` and `/multipart/init` now require `size` to be an integer.
