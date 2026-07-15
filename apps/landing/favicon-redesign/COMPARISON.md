# Favicon redesign — upup (apps/landing)

## Extracted brand color

**`#0e2add`** (deep brand blue) — sampled programmatically as the average of the
988,634 fully-opaque core pixels of `public/img/logo.png` (never hand-picked).
The same blue is the fill of the wordmark and the cloud+arrow mark.

## What changed

The previous icons were a deep-blue **circle** with a white cloud/arrow, and
`favicon.ico` was a **370 KB** single-resolution file (heavily oversized for a
favicon). The redesign keeps the exact brand mark and color but re-shapes it into
a modern, full-bleed **rounded-square tile** and right-sizes every asset.

| Asset | Before | After |
| --- | --- | --- |
| `favicon.ico` | 370,070 B, oversized | **15,086 B**, multi-res 16/32/48 |
| `icon.png` | 192×192 blue circle | **512×512** rounded-square tile, transparent corners |
| `apple-icon.png` | 180×180 circle | **180×180** full-bleed solid-blue square (iOS masks it) |

Design of the new tile (per brief):
- Full-bleed rounded square, corner radius **18%** of size (92 px @ 512).
- Brand mark (cloud + upload arrow, cropped from the real logo at bbox
  x[5..1063] y[2..675]) recolored white and scaled to **~74%** of the tile —
  good space utilization, not a tiny logo in a big margin.
- The 4 corners **outside** the rounded square are fully transparent (alpha 0) —
  no white/opaque box behind the icon.
- `apple-icon.png` is intentionally a solid square with no rounding/transparency:
  iOS applies its own squircle mask, so a full-bleed tile avoids a double-rounded
  look and transparent-corner artifacts.

## Proof

Previews composite each NEW icon over a dark `#0d1017` background and a
magenta/gray checkerboard, so transparent corners are visible where the
background shows through.

- Master icon: [`NEW/icon.png`](NEW/icon.png)
- On dark bg: [`previews/icon_on_dark.png`](previews/icon_on_dark.png)
- On checkerboard (corner transparency visible): [`previews/icon_on_checker.png`](previews/icon_on_checker.png)
- Apple icon on checkerboard (intentionally opaque square): [`previews/apple_on_checker.png`](previews/apple_on_checker.png)
- favicon 32px upscaled on checkerboard: [`previews/favicon32_on_checker.png`](previews/favicon32_on_checker.png)
- Pre-existing icons preserved in [`OLD/`](OLD/)

## Corner-transparency assertion (programmatic)

Read back the rendered 512×512 `icon.png` raw pixels and checked the alpha of all
four corners plus the center:

```
icon.png corners alpha={"tl":0,"tr":0,"bl":0,"br":0}  center alpha=255
ASSERT corners fully transparent (alpha==0): PASS
```

All four corners are fully transparent; the center is fully opaque. **PASS.**
