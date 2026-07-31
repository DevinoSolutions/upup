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
// fileItem/filePreview/fileIcon/fileList; `hero` and `crowded` (1 file →
// FileHero) have fileHero/fileList and never render the card-list components.
// sourceSelector is captured at mount for every variant — for `crowded` that
// mount capture is the whole point (9 sources → compact chip density). The
// parity spec asserts only the components a variant declares (see
// VARIANT_PLAN), so a partial map is exact, not lossy.
export type VariantFixtures = Partial<Record<ParityComponent, NormalizedNode>>

// Read the canonical trees at module load via fs rather than a static JSON
// import: Node's ESM loader requires an import attribute (`with { type: 'json' }`)
// for JSON modules, which is version/loader-sensitive under Playwright's TS runner.
// fs + JSON.parse is loader-agnostic and keeps the same public API.
const HERE = dirname(fileURLToPath(import.meta.url))
const fixtures = JSON.parse(
    readFileSync(join(HERE, 'parity-fixtures.json'), 'utf8'),
) as Record<ParityVariant, VariantFixtures>

/**
 * Canon for one variant, and the ONLY read path into the fixtures — the raw
 * map is deliberately not exported, so an unguarded `fixtures[variant]` can't
 * come back at a call site. The JSON is parsed, not type-checked, so a variant
 * added to PARITY_VARIANTS before its fixtures were captured type-checks fine
 * and then blows up mid-assert with a bare "cannot read properties of
 * undefined". Surface the actionable regen instruction instead. Capture mode
 * (UPDATE_PARITY) never calls this — it WRITES the missing block.
 */
export function variantCanon(variant: ParityVariant): VariantFixtures {
    const block = fixtures[variant]
    if (!block) {
        throw new Error(
            `No parity fixtures for variant "${variant}" — regen them from React (the canon) before asserting:\n` +
                `  UPDATE_PARITY=1 pnpm exec dotenv -e local-dev/.env.minio -- pnpm --filter @upupjs/e2e-test exec playwright test --config playwright.crossframework.config.ts --project react\n` +
                `then review the parity-fixtures.json diff like code. A regen that leaves the file untouched never matched the spec (see CLAUDE.md).`,
        )
    }
    return block
}

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
        assertOnly: ['react', 'vanilla', 'preact', 'vue', 'svelte', 'angular'],
        reason:
            'F-711/F-712 healed by the T10 default-experience port in every ' +
            'framework: angular now renders the Add-More SVG (DefaultAddMoreIcon) ' +
            'and routes ProgressBar positioning classes onto the inner div so the ' +
            'transparent <upup-progress-bar> host is unwrapped (no extra node).',
    },
}
