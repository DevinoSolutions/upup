import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: true,
  sourcemap: true,
  clean: true,
  target: 'es2019',
  external: ['@upup/core', '@upup/vanilla', 'preact', 'preact/hooks'],
  esbuildOptions(options) {
    options.jsx = 'automatic'
    options.jsxImportSource = 'preact'
  },
})

