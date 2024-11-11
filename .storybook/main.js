'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
var config = {
    framework: '@storybook/react-webpack5',
    stories: ['../**/*.stories.@(js|jsx|mjs|ts|tsx)'],
    addons: [
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
