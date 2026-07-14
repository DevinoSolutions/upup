import type { StorybookConfig } from '@storybook/preact-vite'
import preact from '@preact/preset-vite'

// We re-apply `@preact/preset-vite` in the preview so its `react -> preact/compat`
// aliasing + preact dedupe are in effect. @upupjs/preact is a preact/compat-compiled
// build of @upupjs/react; without this aliasing the story and the renderer resolve
// two different preact instances and rendering throws
// "Cannot read properties of undefined (reading '__H')" (preact hooks dispatcher
// mismatch).
//
// `devToolsEnabled: false` is REQUIRED here. Storybook loads this config via
// esbuild-register as CommonJS, which pulls in the preset's CJS build. Its
// `transform-hook-names` plugin does `require("zimmerframe")`, but zimmerframe@1.x
// is ESM-only (its package.json `exports` expose only an "import" condition), so
// that require throws `ERR_PACKAGE_PATH_NOT_EXPORTED` and breaks every module
// importing preact hooks (e.g. packages/preact/dist/index.js). Disabling devtools
// makes `transform-hook-names` return before that require — its only use of
// zimmerframe — while leaving the aliasing/dedupe intact.
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
        cfg.plugins.push(preact({ devToolsEnabled: false }))
        return cfg
    },
}
export default config
