import type { StorybookConfig } from '@storybook/vue3-vite'

const config: StorybookConfig = {
  framework: '@storybook/vue3-vite',
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(ts|tsx)'],
  addons: [
    '@storybook/addon-docs',
    '@storybook/addon-a11y',
    '@storybook/addon-themes',
    'msw-storybook-addon',
  ],
  // Vue ships the esm-bundler build, which expects these compile-time feature
  // flags to be injected by the bundler; without them Vue logs a dev-console
  // warning. Define them explicitly so the canvas console is clean.
  viteFinal: async (config) => {
    config.define = {
      ...config.define,
      __VUE_OPTIONS_API__: 'true',
      __VUE_PROD_DEVTOOLS__: 'false',
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
    }
    return config
  },
}

export default config
