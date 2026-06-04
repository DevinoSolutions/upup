import type { StorybookConfig } from '@storybook/preact-vite'

const config: StorybookConfig = {
  framework: '@storybook/preact-vite',
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: ['@storybook/addon-docs'],
}

export default config

