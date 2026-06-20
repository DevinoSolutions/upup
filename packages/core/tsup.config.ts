import { defineConfig } from 'tsup'

const isWatch = process.argv.includes('--watch')

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'contracts': 'src/contracts.ts',
    'i18n/index': 'src/i18n/index.ts',
    'theme/index': 'src/theme/index.ts',
    'pipeline/index': 'src/pipeline/index.ts',
    'strategies/index': 'src/strategies/index.ts',
    'strategies/tus-upload': 'src/strategies/tus-upload.ts',
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
  clean: !isWatch,
  external: ['libheif-js', 'tus-js-client'],
})
