# Storybook test fixtures

## sample.heic
A 64×64 solid-color still image in HEIF/HEIC (HEVC) format, used by the
WorkerHeic stories to exercise real HEIC→JPEG conversion in a browser.

- **License:** CC0 / public domain (synthetic solid color; no third-party content).
- **Generated offline** with FFmpeg (libx265):

      ffmpeg -y -f lavfi -i color=c=0x4A9EFF:s=64x64 -frames:v 1 -c:v libx265 -tag:v hvc1 -pix_fmt yuv420p -f mp4 -brand "mif1" -movflags +faststart src/fixtures/sample.heic

- **Regenerate the base64 module** after replacing the file:

      node scripts/gen-heic-fixture.mjs

`heicSample.ts` (the inlined base64 consumed by `buildHeicFile()`) is generated
from this file and must not be hand-edited.

> If a future libheif/heic2any build rejects this file, replace `sample.heic`
> with any small CC0/public-domain `.heic` and re-run the generator. The
> acceptance test is the React **WorkerHeic/HeicConversion** story producing a
> `.jpg` tile in a real browser.

## sample.png
Inlined as base64 in `pngSample.ts` (a 1×1 PNG); used by the WebWorkerOffload
story as an image with no HEIC-decode dependency.
