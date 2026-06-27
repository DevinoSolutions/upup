import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { NormalizedNode } from './parity-dom'

export type ParityComponent = 'fileIcon' | 'filePreview' | 'fileItem' | 'adapterSelector'

// Read the canonical trees at module load via fs rather than a static JSON
// import: Node's ESM loader requires an import attribute (`with { type: 'json' }`)
// for JSON modules, which is version/loader-sensitive under Playwright's TS runner.
// fs + JSON.parse is loader-agnostic and keeps the same public API.
const HERE = dirname(fileURLToPath(import.meta.url))
const fixtures = JSON.parse(
  readFileSync(join(HERE, 'parity-fixtures.json'), 'utf8'),
) as Record<ParityComponent, NormalizedNode>

export const PARITY_FIXTURES: Record<ParityComponent, NormalizedNode> = fixtures
