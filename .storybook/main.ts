// Replace your-framework with the framework you are using (e.g., react-webpack5, vue3-vite)
import type { StorybookConfig } from '@storybook/react-webpack5'

const config: StorybookConfig = {
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

export default config
