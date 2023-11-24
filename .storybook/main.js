'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
var config = {
    framework: '@storybook/react-webpack5',
    stories: ['../**/*.mdx', '../**/*.stories.@(js|jsx|mjs|ts|tsx)'],
    addons: [
        // Other addons go here
        // {
        //     name: '@storybook/addon-docs',
        //     options: {
        //         mdxPluginOptions: {
        //             mdxCompileOptions: {
        //                 remarkPlugins: [remarkGfm],
        //             },
        //         },
        //     },
        // },
        {
            name: '@storybook/addon-styling',
            options: {
                // Check out https://github.com/storybookjs/addon-styling/blob/main/docs/api.md
                // For more details on this addon's options.
                postCss: {
                    implementation: require.resolve('postcss'),
                },
            },
        },
    ],
}
exports.default = config
