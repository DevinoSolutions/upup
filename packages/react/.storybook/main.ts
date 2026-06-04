import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { StorybookConfig } from '@storybook/react-vite'

const dirname = path.dirname(fileURLToPath(import.meta.url))

const config: StorybookConfig = {
    framework: '@storybook/react-vite',
    stories: [
        '../src/**/*.mdx',
        '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
    ],
    addons: ['@storybook/addon-docs'],
    async viteFinal(config) {
        return {
            ...config,
            resolve: {
                ...config.resolve,
                alias: {
                    ...(config.resolve?.alias &&
                    !Array.isArray(config.resolve.alias)
                        ? config.resolve.alias
                        : {}),
                    '@upup/core': path.resolve(
                        dirname,
                        '../../core/src/index.ts',
                    ),
                },
            },
        }
    },
}

export default config
