---
'@useupup/core': patch
'@useupup/react': patch
'@useupup/vue': patch
'@useupup/svelte': patch
'@useupup/angular': patch
'@useupup/vanilla': patch
'@useupup/preact': patch
'@useupup/next': patch
---

Calmer, reduced-motion-safe uploader motion. The add-more overlay slides in
250ms (was 350ms), and core's overlay close timer follows it, so the closing
overlay unmounts as soon as its slide ends; the success check draws in 300ms (was 400ms); the success
pop no longer overshoots; the recording dot pulses by opacity only; hover
effects (lift, icon nudge, button sheen, remove tint) only apply on devices that
really hover, the button sheen sweeps in 150ms, the remove button no longer
rotates, and the lift no longer tweens its shadow. With `animations={false}` or
`prefers-reduced-motion: reduce`, transitions, the pulsing record and
drive-loading buttons and the progress-bar width tween are now off too (the bar
still shows its value), while loading spinners keep spinning. No new, renamed or removed classes, tokens,
props or markup (only timing values changed).
