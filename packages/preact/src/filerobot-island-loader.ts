import type { IslandModule } from './filerobot-island-types'

/**
 * Loads the real-React island chunk on demand.
 *
 * The specifier is cast to `string` so TypeScript treats it as a NON-literal dynamic
 * import: that keeps the real-React `filerobot-island.tsx` out of the preact/compat
 * type program (it is checked separately via tsconfig.island.json). esbuild still
 * sees the literal after stripping the cast and, because `/filerobot-island/` is
 * marked `external` in the main tsup config, leaves the import as a runtime reference
 * to the sibling `dist/filerobot-island.js` chunk.
 *
 * Isolating the import here also makes it trivially mockable
 * (vi.mock('../filerobot-island-loader')).
 */
export function loadIsland(): Promise<IslandModule> {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- cast to non-literal string prevents TS from resolving the import into the preact/compat type program
    return import('./filerobot-island.js' as string)
}
