import { defineConfig } from 'tsup'
import vue from 'unplugin-vue/esbuild'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: false,
  splitting: true,
  sourcemap: true,
  clean: true,
  target: 'es2019',
  external: ['vue', '@upup/core'],
  esbuildPlugins: [vue()],
})
