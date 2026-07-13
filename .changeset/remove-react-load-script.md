---
'@useupup/react': patch
---

Remove the unused `load-script` production dependency (dead since the v2
rewrite; no source import). Shrinks the install footprint for @useupup/react
consumers.
