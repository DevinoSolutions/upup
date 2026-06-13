# Storybook test fixtures

## sample.heic
A 64×64 solid-color still image in real HEIF/HEIC (HEVC) format, used by the
WorkerHeic stories to exercise genuine HEIC→JPEG conversion (heic2any/libheif)
in a browser.

- **License:** CC0 / public domain (synthetic solid color; no third-party content).
- **Generated offline** with `pillow-heif` (bundles libheif + an x265 encoder),
  which writes a true *item-based* HEIF still image that libheif/heic2any can
  decode. (FFmpeg is **not** usable here: it has no still-image HEIF muxer — its
  `mp4`/`mov` output is a track-based video container that libheif rejects.)

      python -m pip install pillow pillow-heif
      python -c "from PIL import Image; import pillow_heif; pillow_heif.register_heif_opener(); Image.new('RGB',(64,64),(74,158,255)).save('src/fixtures/sample.heic', format='HEIF', quality=80)"

  The result is a ~400-byte file whose `ftyp` major brand is `heic`
  (compatible brands `mif1`,`heic`).

- **Regenerate the base64 module** after replacing the file:

      node scripts/gen-heic-fixture.mjs

`heicSample.ts` (the inlined base64 consumed by `buildHeicFile()`) is generated
from this file and must not be hand-edited.

> **Acceptance test:** the React **WorkerHeic/HeicConversion** story, in a real
> browser, must cause a JPEG to be *uploaded* (the presign request body shows
> `"type":"image/jpeg"` + `"heicConverted":true`). Note the rendered file tile
> intentionally keeps the original `sample.heic` name — the pipeline rewrites the
> file for upload only — so the stories assert on the upload payload, not the tile.
> If a future libheif/heic2any build rejects this file, replace `sample.heic` with
> any small CC0/public-domain `.heic` and re-run the generator.

## sample.png
Inlined as base64 in `pngSample.ts` (a 1×1 PNG); used by the WebWorkerOffload
story as an image with no HEIC-decode dependency.
