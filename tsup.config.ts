import { defineConfig } from 'tsup'

export default defineConfig([
    {
        entry: ['src/index.browser.ts'],
        outDir: 'dist',
        format: ['esm', 'cjs'],
        dts: {
            entry: 'src/index.browser.ts',
        },
        splitting: false,
        sourcemap: true,
        target: 'es2019',
        minify: true,
        globalName: 'Upup',
    },
    {
        entry: ['src/index.node.ts'],
        outDir: 'dist-node',
        format: ['cjs'],
        dts: {
            entry: 'src/index.node.ts',
        },
        sourcemap: true,
        target: 'node14', // or whichever Node version you want
        minify: true,
        platform: 'node',
    },
])
