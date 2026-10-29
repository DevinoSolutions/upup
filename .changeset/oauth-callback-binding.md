---
'@useupup/server': minor
---

Bind the cloud-drive OAuth callback to the browser that started the flow. `/auth/:provider` now sets a short-lived `HttpOnly` nonce cookie (over https `__Host-upup_oauth_<provider>`, Path=/, Secure; over plain http `upup_oauth_<provider>` scoped to the `/cb` path) and `/auth/:provider/cb` returns 403 `AUTH_DENIED` unless the request carries the matching cookie, so a victim can no longer be walked through an attacker-started flow that saves their Drive tokens under the attacker's user. Flows in flight during the upgrade must be restarted, and browsers must accept cookies on the server's origin. `writeWebResponse` also emits every `Set-Cookie` value when the sink provides `appendHeader`.
