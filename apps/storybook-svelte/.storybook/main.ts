import type { StorybookConfig } from '@storybook/svelte-vite'

const config: StorybookConfig = {
  framework: '@storybook/svelte-vite',
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(ts|tsx)'],
  addons: [
    '@storybook/addon-docs',
    '@storybook/addon-a11y',
    '@storybook/addon-themes',
    'msw-storybook-addon',
  ],
}

export default config
