---
'@useupup/react': patch
'@useupup/vue': patch
'@useupup/svelte': patch
'@useupup/angular': patch
'@useupup/vanilla': patch
'@useupup/preact': patch
---

Opening the add-more sheet or a source view no longer moves keyboard focus onto the decorative top-center sheet grip. The focus-on-open lookup picked the first enabled button in the sheet, which is the grip, so its focus ring was drawn over the view title (for example "Google Drive" at mobile width). The grip is now skipped and focus lands on the first real control; the grip itself stays keyboard-reachable.
