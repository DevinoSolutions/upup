---
'@useupup/react': patch
'@useupup/vue': patch
'@useupup/svelte': patch
'@useupup/angular': patch
'@useupup/vanilla': patch
'@useupup/preact': patch
---

The add-more sheet now takes focus itself (it carries `tabindex="-1"`) when it has no enabled control, so keyboard and screen-reader users no longer stay on the inert list behind it. The sheet also reserves space under its drag grip (`upup-pt-8`), so the grip no longer draws over the end of a source view's header title on narrow widths.
