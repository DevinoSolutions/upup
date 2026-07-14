/**
 * Shared PostCSS config factory for the upup UI packages (react/vue/svelte/vanilla/angular).
 * Each consumer's postcss.config.cjs is one line:
 *   module.exports = require('@upupjs/tailwind-config').createPostcssConfig({
 *     content: ['./src/<glob>'],
 *   })
 *
 * The ONLY per-framework knob is `content` (the source-file glob set). Everything else — the
 * tailwind theme, the `.upup-scope` prefixing, autoprefixer — is identical across all five and
 * lives here.
 */
function createPostcssConfig({ content }) {
    const contentGlobs = Array.isArray(content) ? content : [content]
    return {
        plugins: [
            require('tailwindcss')({
                prefix: 'upup-',
                darkMode: 'class',
                corePlugins: { preflight: true },
                content: [
                    ...contentGlobs,
                    // Brand-icon color classes (upup-text-[#hex]) live in @upupjs/core's icon registry.
                    // Relative to the consuming package's cwd at build time (../core == packages/core).
                    '../core/src/icons/registry.ts',
                ],
                theme: {
                    extend: {
                        containers: { cs: '475px' },
                        keyframes: {
                            'informer-in': {
                                '0%': {
                                    opacity: '0',
                                    transform: 'translateY(8px)',
                                },
                                '100%': {
                                    opacity: '1',
                                    transform: 'translateY(0)',
                                },
                            },
                        },
                        animation: {
                            'informer-in': 'informer-in 0.2s ease-out both',
                        },
                    },
                },
                plugins: [require('@tailwindcss/container-queries')],
            }),
            require('postcss-prefix-selector')({
                prefix: '.upup-scope',
                transform(prefix, selector, prefixedSelector) {
                    if (selector.startsWith('@')) return selector
                    // Idempotent: never re-prefix an already-scoped selector. Safe for all frameworks —
                    // on a single-pass src->dist build no selector contains `.upup-scope` yet, so this
                    // never fires; for re-processed dist CSS (e.g. @storybook/angular's postcss-loader
                    // resolving this config relative to dist/) it prevents a doubled `.upup-scope`.
                    if (selector.indexOf('.upup-scope') !== -1) return selector
                    return prefixedSelector
                },
            }),
            require('autoprefixer'),
        ],
    }
}

module.exports = { createPostcssConfig }
