import { rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const dist = resolve(here, '..', 'dist')
await rm(dist, { recursive: true, force: true })
console.log(`[clean-dist] removed ${dist}`)
