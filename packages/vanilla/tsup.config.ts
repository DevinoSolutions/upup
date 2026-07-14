import { defineConfig } from 'tsup'

const isWatch = process.argv.includes('--watch')

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    element: 'src/element.ts',
  },
  format: ['esm', 'cjs'],
  target: 'es2019',
  dts: true,
  splitting: true,
  treeshake: true,
  clean: !isWatch,
  external: [],
})
