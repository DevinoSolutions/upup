module.exports = {
    plugins: [
        require('tailwindcss')({
            prefix: 'upup-',
            darkMode: 'class',
            corePlugins: { preflight: true },
            content: [
                './src/**/*.{ts,css}',
                // Brand-icon color classes (upup-text-[#hex]) live in @upup/core's icon registry.
                '../core/src/icons/registry.ts',
            ],
            theme: {
                extend: {
                    containers: { cs: '475px' },
                    keyframes: {
                        'informer-in': {
                            '0%': { opacity: '0', transform: 'translateY(8px)' },
                            '100%': { opacity: '1', transform: 'translateY(0)' },
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
                return prefixedSelector
            },
        }),
        require('autoprefixer'),
    ],
}
