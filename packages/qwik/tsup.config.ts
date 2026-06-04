import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.tsx'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: true,
  sourcemap: true,
  clean: true,
  target: 'es2019',
  external: ['@builder.io/qwik', '@upup/core', '@upup/vanilla'],
  esbuildOptions(options) {
    options.jsx = 'automatic'
    options.jsxImportSource = '@builder.io/qwik'
  },
})

