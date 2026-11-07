---
'@useupup/core': patch
---

The OneDrive, Dropbox and Box sign-in popup now opens inside the click that asked for it, so Edge and other strict popup blockers stop reporting "Popup was blocked by the browser". `authenticateViaPopup()` used to `await getAuthUrl()` (the PKCE digest) before `window.open`, which put the open outside the user gesture. It now opens a blank window synchronously, then points it at the provider once the URL is built. If building the URL fails the blank window is closed and the error is rethrown, and an unconfigured `clientId` is refused before any window opens.
