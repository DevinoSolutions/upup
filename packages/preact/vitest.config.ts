import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { existsSync } from 'node:fs'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
// Point @upup/react to our PREACT-compiled dist (already has react→preact/compat applied by tsup)
const preactDist = resolve(__dirname, 'dist/index.js')

// NOTE: run tests via `pnpm test` (triggers pretest→tsup), not bare `vitest` —
// the suite resolves @upup/react to the COMPILED dist, which pretest rebuilds.
if (!existsSync(preactDist)) {
  throw new Error('packages/preact/dist/index.js missing — run `pnpm --filter @upup/preact test` (pretest rebuilds the dist), not bare vitest')
}

export default defineConfig({
  resolve: {
    // Force all preact copies to resolve from one package root
    dedupe: ['preact'],
    alias: [
      // Map @upup/react to OUR preact-compiled dist instead of react source
      // This avoids the need to re-apply react→preact/compat aliases in vitest
      { find: '@upup/react', replacement: preactDist },
    ],
  },
  test: { environment: 'jsdom', globals: true, include: ['src/**/*.spec.{ts,tsx}'] },
})
