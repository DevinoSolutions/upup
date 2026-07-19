import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { NormalizedNode } from './parity-dom'
import type { ParityVariant } from './framework-matrix'

export type ParityComponent =
    | 'fileHero'
    | 'fileIcon'
    | 'filePreview'
    | 'fileItem'
    | 'fileList'
    | 'sourceSelector'

// Each variant captures only the components its file-count state renders, so
// the per-variant map is PARTIAL: `default` (2 files → card list) has
// fileItem/filePreview/fileIcon/fileList; `hero` (1 file → FileHero) has
// fileHero/fileList and never renders the card-list components. sourceSelector
// is captured at mount for every variant. The parity spec asserts only the
// components a variant declares (see VARIANT_PLAN), so a partial map is exact,
// not lossy.
type VariantFixtures = Partial<Record<ParityComponent, NormalizedNode>>

// Read the canonical trees at module load via fs rather than a static JSON
// import: Node's ESM loader requires an import attribute (`with { type: 'json' }`)
// for JSON modules, which is version/loader-sensitive under Playwright's TS runner.
// fs + JSON.parse is loader-agnostic and keeps the same public API.
const HERE = dirname(fileURLToPath(import.meta.url))
const fixtures = JSON.parse(
    readFileSync(join(HERE, 'parity-fixtures.json'), 'utf8'),
) as Record<ParityVariant, VariantFixtures>

export const PARITY_FIXTURES: Record<ParityVariant, VariantFixtures> = fixtures

/**
 * Self-liquidating exception list: a component whose canon (react) fixture is
 * hard-asserted only against the listed frameworks. The remaining frameworks
 * get the INVERSE forcing check in parity.spec.ts (fails the moment the
 * excepted framework's capture starts matching canon) — the exception cannot
 * silently outlive the bug it documents. Empty when every port matches canon;
 * add an entry only while a divergence is deliberately carried, and remove it
 * (flip to all-six equality) the moment the fix lands. B5a prematurely
 * zeroed this: vue/svelte/angular still lack the Add-More SVG icon (F-711)
 * and angular's <upup-progress-bar> host wraps an extra node (F-712).
 * Re-added with inverse forcing so they self-liquidate.
 */
export const KNOWN_DIVERGENCES: Partial<
    Record<ParityComponent, { assertOnly: string[]; reason: string }>
> = {
    fileList: {
        assertOnly: ['react', 'vanilla', 'preact', 'vue', 'svelte'],
        reason:
            'F-711 Add-More SVG icon missing in angular header (healed in ' +
            'vue+svelte by the T10 default-experience port); F-712 angular ' +
            '<upup-progress-bar> host element wraps extra node',
    },
}
