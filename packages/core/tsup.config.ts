import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'pipeline/index': 'src/pipeline/index.ts',
    'steps/hash': 'src/steps/hash.ts',
    'steps/gzip': 'src/steps/gzip.ts',
    'steps/heic': 'src/steps/heic.ts',
    'steps/exif': 'src/steps/exif.ts',
    'steps/compress': 'src/steps/compress.ts',
    'steps/thumbnail': 'src/steps/thumbnail.ts',
    'steps/deduplicate': 'src/steps/deduplicate.ts',
  },
  format: ['esm', 'cjs'],
  target: 'es2019',
  dts: true,
  splitting: true,
  treeshake: true,
  clean: true,
  external: ['@upup/shared'],
})
