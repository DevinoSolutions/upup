import { defineConfig } from 'vitest/config'

// Scoped to src so vitest never descends into the generated .mastra/output tree
// (which vendors its own node_modules, incl. zod's own *.test.ts suites).
export default defineConfig({
    test: {
        include: ['src/**/*.{test,spec}.ts'],
    },
})
