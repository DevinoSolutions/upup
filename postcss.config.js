module.exports = {
    plugins: [
        // ① build the raw tailwind output first
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('tailwindcss')({
            prefix: 'upup-', // keep your utility prefix
            darkMode: 'class',
            corePlugins: { preflight: true }, // keep Preflight ON
            content: ['./src/**/*.{tsx,ts,css}'],
            theme: { extend: { containers: { cs: '475px' } } },
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            plugins: [require('@tailwindcss/container-queries')],
        }),

        // ② now wrap *every* selector—including Preflight
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('postcss-prefix-selector')({
            prefix: '.upup-scope',
            transform(prefix, selector, prefixedSelector) {
                // Don't double‑wrap keyframes or @font‑face
                if (selector.startsWith('@')) return selector
                return prefixedSelector
            },
        }),

        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('autoprefixer'),
    ],
}
