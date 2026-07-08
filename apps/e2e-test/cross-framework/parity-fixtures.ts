import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { NormalizedNode } from './parity-dom'
import type { ParityVariant } from './framework-matrix'

export type ParityComponent =
    'fileIcon' | 'filePreview' | 'fileItem' | 'fileList' | 'sourceSelector'

// Read the canonical trees at module load via fs rather than a static JSON
// import: Node's ESM loader requires an import attribute (`with { type: 'json' }`)
// for JSON modules, which is version/loader-sensitive under Playwright's TS runner.
// fs + JSON.parse is loader-agnostic and keeps the same public API.
const HERE = dirname(fileURLToPath(import.meta.url))
const fixtures = JSON.parse(
    readFileSync(join(HERE, 'parity-fixtures.json'), 'utf8'),
) as Record<ParityVariant, Record<ParityComponent, NormalizedNode>>

export const PARITY_FIXTURES: Record<
    ParityVariant,
    Record<ParityComponent, NormalizedNode>
> = fixtures

/**
 * Self-liquidating exception list: a component whose canon (react) fixture is
 * hard-asserted only against the listed frameworks. The remaining frameworks
 * get the INVERSE forcing check in parity.spec.ts (fails the moment the
 * excepted framework's capture starts matching canon) — the exception cannot
 * silently outlive the bug it documents. Empty when every port matches canon;
 * add an entry only while a divergence is deliberately carried, and remove it
 * (flip to all-six equality) the moment the fix lands. (F-711 Add-More icon +
 * F-712 angular progress-bar placement landed — entry removed.)
 */
export const KNOWN_DIVERGENCES: Partial<
    Record<ParityComponent, { assertOnly: string[]; reason: string }>
> = {}
