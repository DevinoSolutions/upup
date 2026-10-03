---
'@useupup/core': patch
---

The Dropbox drive view shows Log out and search again. The account-profile
request sent a JSON Content-Type with an empty body, which Dropbox answers with
a 500, so the signed-in user was never loaded and the header hid both
controls. The request now sends a JSON `null` body.
