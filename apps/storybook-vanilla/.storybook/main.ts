import type { StorybookConfig } from '@storybook/html-vite'
import { withUpupViteWorkerFormat } from '@upupjs/storybook-config/vite'

const config: StorybookConfig = {
    framework: {
        name: '@storybook/html-vite',
        options: {},
    },
    stories: ['../src/**/*.mdx', '../src/**/*.stories.@(ts|tsx)'],
    addons: [
        '@storybook/addon-docs',
        '@storybook/addon-a11y',
        '@storybook/addon-themes',
        'msw-storybook-addon',
    ],
    // Shared: ES worker output for core's module pipeline worker.
    viteFinal: async config => withUpupViteWorkerFormat(config),
}

export default config
