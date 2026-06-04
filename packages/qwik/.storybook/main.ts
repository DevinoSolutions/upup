import { qwikVite } from '@builder.io/qwik/optimizer'

const config = {
  framework: 'storybook-framework-qwik',
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: ['@storybook/addon-docs'],
  viteFinal: async (config) => ({
    ...config,
    plugins: [
      ...(config.plugins ?? []),
      qwikVite({
        client: {
          input: 'src/index.tsx',
        },
        entryStrategy: {
          type: 'hook',
        },
      }),
    ],
  }),
}

export default config
