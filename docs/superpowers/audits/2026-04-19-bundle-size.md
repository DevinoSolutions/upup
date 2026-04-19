# Bundle size audit — `upup-react-file-uploader@2.2.0`

Measured against `dist/` produced by `pnpm --filter upup-react-file-uploader build`.

## Sizes

| Artifact              | Raw     | Gzipped | Brotli  |
|-----------------------|---------|---------|---------|
| `dist/index.js` (ESM) | 688 KB  | 232 KB  | 204 KB  |
| `dist/index.cjs`      | 703 KB  | 233 KB  | 204 KB  |
| `dist/tailwind-prefixed.css` | 41 KB   | 7.7 KB  | 6.2 KB  |
| `dist/locales/index.js` | 71 KB   | 14 KB   | 12 KB   |

**Client runtime ESM + CSS gzipped: ~240 KB.**

## Published package tarball

- Tarball: 1.2 MB packed, 4.3 MB unpacked, 16 files
- Half of the unpacked size is source maps (`.js.map` + `.cjs.map` ≈ 2.4 MB) — these are only downloaded by tools fetching sources, not browsers

## Vendor contribution (heuristic — string occurrence count in `dist/index.js`)

| Dep                    | Refs | Notes                                          |
|------------------------|------|------------------------------------------------|
| `dropbox`              | 131  | **Heaviest** — full Dropbox SDK bundled        |
| `react-icons`          | 9    | We already replaced most with local brand icons in v2.1 — this is residual |
| `intl-messageformat`   | 8    | Required for ICU; bundled via `@upup/shared`   |
| `filerobot-image-editor` | 8  | Optional peer — should NOT be bundled          |
| `framer-motion`        | 6    | Motion primitives for drawer/picker anims      |
| `truncate`             | 6    | Used for file name display                     |
| `pako`                 | 3    | gzip step in the pipeline                      |
| `uuid`                 | 3    | File id generation                             |
| `clsx` + `tailwind-merge` | 5 | Class name utilities                           |

## Bundle trimming opportunities

1. **`dropbox` SDK** (~100 KB raw). Called only for Dropbox drive auth.
   - In Client Mode, we could lazy-import it behind `<DropboxUploader>`
     and keep the main bundle slim for AWS-only consumers.
   - In Server Mode, the package isn't needed client-side at all — the
     server proxies the drive API. Can be conditionally excluded.
   - **Estimate:** ~80 KB gzip savings if moved to dynamic import.
2. **`filerobot-image-editor`** is listed as an optional peer in
   `package.json` but appears in the bundle. Should be a dynamic import
   gated on `imageEditor` prop.
   - **Estimate:** ~30 KB gzip savings.
3. **`heic2any`** — not bundled in the current dist (not in the refs
   count). Good, it's already lazy-loaded behind a capability check.
4. **Locales** are already a separate subpath export
   (`upup-react-file-uploader/locales`) and consumers only pay the 14 KB
   if they opt into non-English.

**Realistic target for v2.3:** 150 KB gzipped runtime (≈37% reduction),
achievable with tasks 1 and 2 above.

## Competitive comparison

| Library         | Gzipped main bundle |
|-----------------|---------------------|
| Uppy Core       | ~50 KB              |
| Uppy Dashboard  | ~150 KB             |
| uploadthing     | ~30 KB              |
| **upup v2.2**   | **232 KB**          |
| FilePond        | ~60 KB              |

We're on the heavy end because we ship a lot in-box: 10 storage
providers, 4 drive adapters, image editor integration, HEIC conversion,
camera + audio + screencast adapters, pipeline transform steps, 9
locales. Consumers using only S3 + drag-and-drop today pay for code
they don't use — the bundle work above targets that.
