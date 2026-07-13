import { defineConfig } from 'tsup'
import { fileURLToPath } from 'node:url'

const bridge = fileURLToPath(
    new URL('./src/filerobot-bridge.tsx', import.meta.url),
)

export default defineConfig([
    // ── Main build: @useupup/react chrome compiled to preact/compat ────────────────
    {
        entry: ['src/index.ts'],
        format: ['esm', 'cjs'],
        dts: true,
        splitting: true,
        sourcemap: true,
        clean: false, // cleaned once up-front by scripts/clean-dist.mjs
        target: 'es2019',
        // Browser platform activates the "browser" export condition, so preact/compat
        // resolves to its ESM build (compat.module.js) even when reached through a
        // CJS require() context (e.g. react-webcam's UMD `require("react")` aliased to
        // preact/compat). Without this, a require()-kind reference falls through to the
        // CJS compat.js, whose `require("preact")` compiles to esbuild's __require shim
        // and throws "Dynamic require of preact is not supported" at runtime — which
        // killed the lazy CameraUploader chunk (@useupup/preact camera view). preact stays
        // external, so no duplicate preact instance is bundled.
        platform: 'browser',
        noExternal: [
            '@useupup/react',
            'react',
            'react-dom',
            'react-filerobot-image-editor',
        ],
        external: [
            'preact',
            'preact/compat',
            'preact/hooks',
            'preact/jsx-runtime',
            '@useupup/core',
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
        external: ['preact', 'preact/compat', '@useupup/core'],
        esbuildOptions(options) {
            options.jsx = 'automatic'
            options.jsxImportSource = 'react'
        },
    },
])
