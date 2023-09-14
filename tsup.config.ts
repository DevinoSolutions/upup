import { defineConfig, Options } from 'tsup'

export default defineConfig((options: Options) => ({
    treeshake: true,
    splitting: true,
    entry: ['src/**/*.tsx'],
    format: ['cjs'],
    dts: true,
    minify: true,
    clean: true,
    external: ['react', 'react-dom', 'react/jsx-runtime'],
    inject: ['./react-import.js'],
    ...options,
}))
