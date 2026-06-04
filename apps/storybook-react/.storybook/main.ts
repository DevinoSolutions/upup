import type { StorybookConfig } from '@storybook/react-vite'

const VUE_DEV_URL = 'http://localhost:53051'

const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(ts|tsx)'],
  addons: [
    '@storybook/addon-docs',
    '@storybook/addon-a11y',
    '@storybook/addon-themes',
    'msw-storybook-addon',
  ],
  refs: (_config, { configType }) => ({
    vue: {
      title: 'Vue',
      url: configType === 'DEVELOPMENT' ? VUE_DEV_URL : './vue',
    },
  }),
}

export default config
