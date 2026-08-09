import type { StorybookConfig } from '@storybook/react-vite'
import { withUpupViteWorkerFormat } from '@upupjs/storybook-config/vite'

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
    // Shared: ES worker output for core's module pipeline worker — see the
    // helper's comment. This app currently builds green without it (its
    // @storybook/react-vite resolves a rolldown-based vite, which tolerates the
    // default), but the rule is the same one every other vite storybook needs
    // and a bundler swap must not silently reintroduce the nightly breakage.
    viteFinal: async config => withUpupViteWorkerFormat(config),
}

export default config
