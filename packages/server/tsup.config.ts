import { defineConfig } from 'tsup'
export default defineConfig({
    entry: [
        'src/index.ts',
        'src/next.ts',
        'src/express.ts',
        'src/hono.ts',
        'src/fastify.ts',
        'src/node-http-bridge.ts',
    ],
    format: ['esm', 'cjs'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    target: 'node18',
    platform: 'node',
    external: ['@upupjs/core'],
})
