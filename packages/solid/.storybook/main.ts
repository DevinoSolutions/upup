import type { StorybookConfig } from 'storybook-solidjs-vite'

const config: StorybookConfig = {
  framework: 'storybook-solidjs-vite',
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: ['@storybook/addon-docs'],
}

export default config

