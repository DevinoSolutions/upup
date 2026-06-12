import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
// Point @upup/react to our PREACT-compiled dist (already has react→preact/compat applied by tsup)
const preactDist = resolve(__dirname, 'dist/index.js')

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
