import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { NormalizedNode } from './parity-dom'

export type ParityComponent = 'fileIcon' | 'filePreview' | 'fileItem' | 'fileList' | 'sourceSelector'

// Read the canonical trees at module load via fs rather than a static JSON
// import: Node's ESM loader requires an import attribute (`with { type: 'json' }`)
// for JSON modules, which is version/loader-sensitive under Playwright's TS runner.
// fs + JSON.parse is loader-agnostic and keeps the same public API.
const HERE = dirname(fileURLToPath(import.meta.url))
const fixtures = JSON.parse(
  readFileSync(join(HERE, 'parity-fixtures.json'), 'utf8'),
) as Record<ParityComponent, NormalizedNode>

export const PARITY_FIXTURES: Record<ParityComponent, NormalizedNode> = fixtures

/**
 * Self-liquidating exception list: a component whose canon (react) fixture is
 * hard-asserted only against the listed frameworks. The remaining frameworks
 * get the INVERSE forcing check in parity.spec.ts (fails the moment the
 * excepted framework's capture starts matching canon) — the exception cannot
 * silently outlive the bug it documents. Filed centrally as F-711/F-712;
 * remove the entry (flip to all-six equality) once those land.
 */
export const KNOWN_DIVERGENCES: Partial<Record<ParityComponent, { assertOnly: string[]; reason: string }>> = {
  fileList: {
    assertOnly: ['react', 'preact'],
    reason:
      'F-711 (Add-More icon missing in vue/svelte/vanilla/angular) + F-712 (angular stray upup-progress-bar node) — flip to all-six when fixed',
  },
}
