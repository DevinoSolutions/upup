import { defineConfig } from 'tsup'
import { fileURLToPath } from 'node:url'

const bridge = fileURLToPath(
  new URL('./src/filerobot-bridge.tsx', import.meta.url),
)

export default defineConfig([
  // ── Main build: @upup/react chrome compiled to preact/compat ────────────────
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    splitting: true,
    sourcemap: true,
    clean: false, // cleaned once up-front by scripts/clean-dist.mjs
    target: 'es2019',
    noExternal: ['@upup/react', 'react', 'react-dom', 'react-filerobot-image-editor'],
    external: [
      'preact',
      'preact/compat',
      'preact/hooks',
      'preact/jsx-runtime',
      '@upup/core',
      /filerobot-island\.js$/, // leave the bridge's dynamic island import as a runtime ref (must NOT match filerobot-island-loader)
    ],
    esbuildOptions(options) {
      options.alias = {
        react: 'preact/compat',
        'react-dom': 'preact/compat',
        'react/jsx-runtime': 'preact/jsx-runtime',
        'react/jsx-dev-runtime': 'preact/jsx-runtime',
        'react-dom/client': 'preact/compat',
        'react-filerobot-image-editor': bridge, // was the no-op stub
      }
    },
  },
  // ── Island build: real React, alias-free, inlined into one lazy ESM chunk ────
  {
    entry: ['src/filerobot-island.tsx'],
    format: ['esm'],
    dts: false,
    splitting: false,
    sourcemap: true,
    clean: false,
    target: 'es2019',
    platform: 'browser',
    tsconfig: 'tsconfig.island.json',
    noExternal: [
      'react',
      'react-dom',
      'react-konva',
      'konva',
      'react-filerobot-image-editor',
      'styled-components',
    ],
    external: ['preact', 'preact/compat', '@upup/core'],
    esbuildOptions(options) {
      options.jsx = 'automatic'
      options.jsxImportSource = 'react'
    },
  },
])
