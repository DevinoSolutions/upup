import type { StorybookConfig } from '@storybook/web-components-vite'

const config: StorybookConfig = {
  framework: '@storybook/web-components-vite',
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|mjs|ts)'],
  addons: ['@storybook/addon-docs'],
}

export default config

