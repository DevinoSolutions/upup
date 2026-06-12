import { copyFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
mkdirSync('./dist', { recursive: true })
try {
  copyFileSync(require.resolve('@upup/react/styles'), './dist/tailwind-prefixed.css')
} catch (err) {
  throw new Error('Failed to copy @upup/react styles — ensure @upup/react is built first (turbo ^build handles this in CI).\n' + err.message)
}
