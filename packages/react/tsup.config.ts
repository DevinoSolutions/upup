import { defineConfig } from 'tsup'
export default defineConfig({
  entry: ['src/index.ts', 'src/locales/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  target: 'es2019',
  external: [
    '@upup/core',
    '@upup/shared',
    'react',
    'react-dom',
    'react-filerobot-image-editor',
    'filerobot-image-editor',
    'react-konva',
    'konva',
    'styled-components',
  ],
})
