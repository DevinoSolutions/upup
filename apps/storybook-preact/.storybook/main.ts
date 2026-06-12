import type { StorybookConfig } from '@storybook/preact-vite'
import preact from '@preact/preset-vite'

const config: StorybookConfig = {
  framework: { name: '@storybook/preact-vite', options: {} },
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(ts|tsx)'],
  addons: [
    '@storybook/addon-docs',
    '@storybook/addon-a11y',
    '@storybook/addon-themes',
    'msw-storybook-addon',
  ],
  async viteFinal(cfg) {
    cfg.plugins = cfg.plugins ?? []
    cfg.plugins.push(preact())
    return cfg
  },
}
export default config
