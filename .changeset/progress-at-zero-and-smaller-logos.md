---
'@useupup/react': patch
'@useupup/vue': patch
'@useupup/svelte': patch
'@useupup/angular': patch
'@useupup/vanilla': patch
'@useupup/preact': patch
---

The compact file row shows its progress bar as soon as a run starts (#352), and
the branding logo assets are ~92% smaller (#229).

`ProgressBar` already renders whenever the run is active or progress is
non-zero, but every framework's compact `FileRow` wrapped it in a second
`!!progress` gate. That outer gate won whenever it was falsy, so the row stayed
blank between "upload started" and "first byte acknowledged" while the grid
tile, the single-file hero and the list footer all showed their bars. The
redundant wrapper is removed in all five row templates; the self-gate inside
`ProgressBar` is now the only one. No change at idle — with no progress and no
active run the bar is still absent, so the parity fixtures do not move.

The four base64 PNG logo assets in `src/assets/logos.ts` are re-exported at
122x26, twice the fixed 61x13 CSS-pixel box every framework renders them in.
They were shipping at up to 1905x580 — roughly 30x the rendered area. Each
package's copy of that file drops from 167 KB to 13 KB, about 109 KB gzipped off
every UI bundle, with the rendered appearance unchanged. The assets stay PNG:
there is no vector source for them in the repo.
