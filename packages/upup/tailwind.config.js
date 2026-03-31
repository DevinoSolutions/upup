/** @type {import('tailwindcss').Config} */
module.exports = {
    prefix: 'upup-',
    content: ['./src/**/*.{tsx,ts,css}', './stories/**/*.{tsx,ts,jsx,js}'],
    important: '.upup-scope',
    darkMode: 'class',
    theme: {
        extend: {
            containers: {
                cs: '475px',
            },
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
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    plugins: [require('@tailwindcss/container-queries')],
}
