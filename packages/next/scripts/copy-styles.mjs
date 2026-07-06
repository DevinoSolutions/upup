import { createRequire } from 'node:module'
import { copyFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const require = createRequire(import.meta.url)
const here = dirname(fileURLToPath(import.meta.url))

const outDir = resolve(here, '..', 'dist')
const dest = resolve(outDir, 'tailwind-prefixed.css')

await mkdir(outDir, { recursive: true })
try {
  // Resolve via the exported './styles' subpath (not ./package.json which is unexported)
  const src = require.resolve('@upup/react/styles')
  await copyFile(src, dest)
  console.log(`[copy-styles] ${src} -> ${dest}`)
} catch (err) {
  throw new Error(
    '[copy-styles] Failed to copy @upup/react styles — ensure @upup/react is built first (turbo ^build handles this in CI).',
    { cause: err },
  )
}
