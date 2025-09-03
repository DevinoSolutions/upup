/** @type { import('@storybook/react-webpack5').StorybookConfig } */
import dotenv from 'dotenv'
dotenv.config()
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
            name: '@storybook/addon-styling-webpack',

            options: {
                rules: [
                    {
                        test: /\.css$/,
                        sideEffects: true,
                        use: [
                            require.resolve('style-loader'),
                            {
                                loader: require.resolve('css-loader'),
                                options: {
                                    importLoaders: 1,
                                },
                            },
                            {
                                loader: require.resolve('postcss-loader'),
                                options: {
                                    implementation: require.resolve('postcss'),
                                },
                            },
                        ],
                    },
                ],
            },
        },
        '@storybook/addon-themes',
        '@storybook/addon-webpack5-compiler-babel',
        '@chromatic-com/storybook',
    ],

    core: {
        builder: '@storybook/builder-webpack5',
    },

    webpackFinal: async (config: {
        module: { rules: any[] }
        resolve: { fallback: any; alias: any }
    }) => {
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

    typescript: {
        reactDocgen: 'react-docgen-typescript',
    },

    env: (config: any) => ({
        ...config,
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID!,
        GOOGLE_API_KEY: process.env.GOOGLE_API_KEY!,
        GOOGLE_APP_ID: process.env.GOOGLE_APP_ID!,
        ONEDRIVE_CLIENT_ID: process.env.ONEDRIVE_CLIENT_ID!,
        DROPBOX_CLIENT_ID: process.env.DROPBOX_CLIENT_ID!,
        DROPBOX_REDIRECT_URI: process.env.dropbox_redirect_uri!,
    }),
}

export default config
