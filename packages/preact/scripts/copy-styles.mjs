import { copyFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
mkdirSync('./dist', { recursive: true })
copyFileSync(require.resolve('@upup/react/styles'), './dist/tailwind-prefixed.css')
