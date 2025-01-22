/** @type { import('@storybook/react-webpack5').StorybookConfig } */
const config = {
    framework: {
        name: '@storybook/react-webpack5',
        options: {},
    },
    stories: ['../stories/**/*.stories.@(js|jsx|ts|tsx)'],
    addons: [
        '@storybook/addon-links',
        '@storybook/addon-essentials',
        '@storybook/addon-interactions',
        '@storybook/addon-docs',
        {
            name: '@storybook/addon-styling',
            options: {
                postCss: {
                    implementation: require.resolve('postcss'),
                },
            },
        },
    ],
    core: {
        builder: '@storybook/builder-webpack5',
    },
    webpackFinal: async config => {
        // Remove default rules for .md files
        config.module.rules = config.module.rules.filter(
            rule => !rule.test?.test?.('.md'),
        )

        return {
            ...config,
            resolve: {
                ...config.resolve,
                fallback: {
                    ...config.resolve?.fallback,
                    'highlight.js/lib/core': require.resolve(
                        'highlight.js/lib/core',
                    ),
                    'highlight.js/lib/languages/c-like': false,
                    'highlight.js/lib/languages/sql_more': false,
                },
                alias: {
                    ...config.resolve?.alias,
                    'lowlight/lib/core': require.resolve('lowlight'),
                    'react-syntax-highlighter/dist/esm/light': require.resolve(
                        'react-syntax-highlighter/dist/cjs/light',
                    ),
                    'react-syntax-highlighter/dist/esm/light-async':
                        require.resolve(
                            'react-syntax-highlighter/dist/cjs/light-async',
                        ),
                },
            },
            module: {
                ...config.module,
                rules: [
                    ...config.module.rules,
                    {
                        test: /\.md$/,
                        type: 'javascript/auto',
                    },
                    {
                        test: /\.m?js$/,
                        resolve: {
                            fullySpecified: false,
                        },
                    },
                ],
            },
        }
    },
}

export default config
