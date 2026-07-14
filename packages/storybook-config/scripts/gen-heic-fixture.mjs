// Emits src/fixtures/heicSample.ts (base64 of sample.heic). Run after replacing
// the .heic:  node scripts/gen-heic-fixture.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const heicPath = resolve(here, '../src/fixtures/sample.heic')
const outPath = resolve(here, '../src/fixtures/heicSample.ts')
const b64 = readFileSync(heicPath).toString('base64')

const ts = `// src/fixtures/heicSample.ts
// AUTO-GENERATED from fixtures/sample.heic by scripts/gen-heic-fixture.mjs.
// Do not hand-edit — regenerate after replacing sample.heic. See fixtures/README.md.
import { base64ToBytes } from './base64'

export const HEIC_SAMPLE_BASE64 =
  '${b64}'

export function buildHeicFile(name = 'sample.heic'): File {
  return new File([base64ToBytes(HEIC_SAMPLE_BASE64)], name, { type: 'image/heic' })
}
`
writeFileSync(outPath, ts)
console.log('wrote', outPath, '-', b64.length, 'base64 chars')
