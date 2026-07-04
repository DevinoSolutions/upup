---
"@upup/server": patch
---

handler.ts decomposed into concern modules (respond, upload-routes, oauth, drive-routes, drive-clients); OAuth responses now carry CORS headers + a request id; no API change.
