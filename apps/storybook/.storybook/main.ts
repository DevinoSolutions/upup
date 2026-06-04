import type { StorybookConfig } from '@storybook/react-vite'

const reactUrl = process.env.UPUP_STORYBOOK_REACT_URL
const vueUrl = process.env.UPUP_STORYBOOK_VUE_URL
const vanillaUrl = process.env.UPUP_STORYBOOK_VANILLA_URL
const nextUrl = process.env.UPUP_STORYBOOK_NEXT_URL
const preactUrl = process.env.UPUP_STORYBOOK_PREACT_URL
const solidUrl = process.env.UPUP_STORYBOOK_SOLID_URL
const svelteUrl = process.env.UPUP_STORYBOOK_SVELTE_URL
const qwikUrl = process.env.UPUP_STORYBOOK_QWIK_URL
const angularUrl = process.env.UPUP_STORYBOOK_ANGULAR_URL

const config: StorybookConfig = {
    framework: '@storybook/react-vite',
    stories: ['../src/**/*.mdx'],
    addons: ['@storybook/addon-docs'],
    refs: (_config, { configType }) => {
        const isDev = configType === 'DEVELOPMENT'

        return {
            react: {
                title: 'Upup React',
                url: reactUrl ?? (isDev ? 'http://localhost:6007' : ''),
            },
            vue: {
                title: 'Upup Vue',
                url: vueUrl ?? (isDev ? 'http://localhost:6008' : ''),
            },
            vanilla: {
                title: 'Upup Vanilla',
                url: vanillaUrl ?? (isDev ? 'http://localhost:6009' : ''),
            },
            next: {
                title: 'Upup Next.js',
                url: nextUrl ?? (isDev ? 'http://localhost:6015' : ''),
            },
            preact: {
                title: 'Upup Preact',
                url: preactUrl ?? (isDev ? 'http://localhost:6010' : ''),
            },
            solid: {
                title: 'Upup Solid',
                url: solidUrl ?? (isDev ? 'http://localhost:6011' : ''),
            },
            svelte: {
                title: 'Upup Svelte',
                url: svelteUrl ?? (isDev ? 'http://localhost:6012' : ''),
            },
            qwik: {
                title: 'Upup Qwik',
                url: qwikUrl ?? (isDev ? 'http://localhost:6013' : ''),
            },
            angular: {
                title: 'Upup Angular',
                url: angularUrl ?? (isDev ? 'http://localhost:6014' : ''),
            },
        }
    },
}

export default config
