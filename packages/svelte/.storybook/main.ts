import type { StorybookConfig } from '@storybook/svelte-vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

const config: StorybookConfig = {
  framework: {
    name: '@storybook/svelte-vite',
    options: {
      docgen: false,
    },
  },
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|mjs|ts)'],
  addons: ['@storybook/addon-docs'],
  viteFinal: async (config) => ({
    ...config,
    plugins: [...(config.plugins ?? []), svelte()],
  }),
}

export default config
