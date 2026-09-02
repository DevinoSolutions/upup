---
'@upupjs/core': patch
---

`imageCompression` and `stripExifData` no longer flatten animated images. Both
steps re-encode through a canvas, and canvas has no animated encoder:
`drawImage` paints the first frame and `toBlob`/`convertToBlob` writes a still,
so enabling either option silently replaced an uploaded animated GIF with a
single frame — the upload succeeded and the user got a frozen image back.

Both steps now sniff the file first and pass animated GIF, animated WebP and
APNG through untouched. Detection is byte-level (GIF image descriptors plus the
NETSCAPE2.0/ANIMEXTS1.0 looping extension; the APNG `acTL` chunk; the WebP
`VP8X` animation flag and `ANIM`/`ANMF` chunks) rather than `ImageDecoder`-based,
so it behaves identically in every browser. Still images of the same formats are
processed exactly as before, and the upload itself is untouched either way.

`thumbnailGenerator` is deliberately unchanged — a thumbnail is a still by
definition, and it is stored alongside the file rather than replacing it.
