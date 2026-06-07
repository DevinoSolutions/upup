import type { StorybookConfig } from '@storybook/svelte-vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { mergeConfig } from 'vite'

const config: StorybookConfig = {
  framework: {
    name: '@storybook/svelte-vite',
    options: {
      // No first-party .svelte components are authored in this Storybook: the
      // stories are .ts and render the pre-built @upup/svelte library. With
      // nothing of our own to document, the docgen step (svelte2tsx) only ends
      // up parsing the library's *built* .svelte files — which it cannot parse
      // and has no reason to — and crashes the build. Skip it.
      docgen: false,
    },
  },
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(ts|tsx)'],
  addons: [
    '@storybook/addon-docs',
    '@storybook/addon-a11y',
    '@storybook/addon-themes',
    'msw-storybook-addon',
  ],
  // @storybook/svelte-vite only registers its own docgen plugin — it does NOT
  // add the Svelte compiler, relying on the project's Vite config to provide it.
  // Our story files are .ts and our components ship pre-compiled (svelte-package),
  // so the only raw .svelte in the graph is @storybook/svelte's own renderer
  // (PreviewRender.svelte etc.). Without the compiler those reach
  // vite:import-analysis untransformed and fail to parse. Register it here.
  viteFinal: async (config) =>
    mergeConfig(config, {
      plugins: [svelte()],
    }),
}

export default config
