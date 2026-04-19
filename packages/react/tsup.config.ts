import { defineConfig } from 'tsup'
export default defineConfig({
  entry: ['src/index.ts', 'src/locales/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  target: 'es2019',
  // @upup/core and @upup/shared are bundled into the published artifact so
  // npm consumers install `upup-react-file-uploader` and get everything.
  // They remain workspace packages internally for modular development.
  external: [
    'react',
    'react-dom',
    'react-filerobot-image-editor',
    'filerobot-image-editor',
    'react-konva',
    'konva',
    'styled-components',
  ],
  noExternal: ['@upup/core', '@upup/shared'],
})
