---
'@useupup/angular': patch
---

`@useupup/angular` now installs on Angular 20, 21 and 22. The peer range was
`^19` only, so npm refused with ERESOLVE. It also declares
`@angular/platform-browser`, which it already imports, as a peer.
