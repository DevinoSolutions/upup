// src/fixtures/pngSample.ts
// Minimal valid 1×1 PNG, base64-inlined, so the worker/fallback stories have a
// real image File to push through the pipeline with no HEIC-decode dependency.
import { base64ToBytes } from './base64'

export const PNG_SAMPLE_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAen63NgAAAAASUVORK5CYII='

export function buildPngFile(name = 'sample.png'): File {
  return new File([base64ToBytes(PNG_SAMPLE_BASE64)], name, { type: 'image/png' })
}
