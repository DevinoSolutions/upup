import { defineConfig } from 'tsup'
import { fileURLToPath } from 'node:url'

const stub = fileURLToPath(new URL('./src/image-editor-stub.tsx', import.meta.url))

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: true,
  sourcemap: true,
  clean: true,
  target: 'es2019',
  noExternal: ['@upup/react'],
  external: ['preact', 'preact/compat', 'preact/hooks', 'preact/jsx-runtime', '@upup/core'],
  esbuildOptions(options) {
    options.alias = {
      react: 'preact/compat',
      'react-dom': 'preact/compat',
      'react/jsx-runtime': 'preact/jsx-runtime',
      'react-dom/client': 'preact/compat',
      'react-filerobot-image-editor': stub,
    }
  },
})
