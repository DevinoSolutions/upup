import { defineConfig } from 'tsup'

export default defineConfig([
    // Client entry — re-exports @useupup/react UI. The banner GUARANTEES the
    // 'use client' directive survives bundling, so a Server Component can import
    // the uploader without the "needs use client" error.
    {
        entry: ['src/index.ts'],
        format: ['esm', 'cjs'],
        dts: true,
        splitting: false,
        sourcemap: true,
        clean: false, // cleaned once up-front by scripts/clean-dist.mjs
        target: 'es2019',
        banner: { js: '"use client";' },
        external: ['react', 'react-dom', '@useupup/react', '@useupup/core'],
    },
    // Server entry — Node-only handlers. Never imported by the client entry, so
    // @aws-sdk (pulled via @useupup/server) stays out of client bundles.
    {
        entry: ['src/server.ts'],
        format: ['esm', 'cjs'],
        dts: true,
        splitting: false,
        sourcemap: true,
        clean: false,
        target: 'node18',
        platform: 'node',
        external: [
            '@useupup/server',
            '@useupup/core',
            'next',
            'react',
            'react-dom',
            '@aws-sdk/client-s3',
            '@aws-sdk/s3-request-presigner',
        ],
    },
])
