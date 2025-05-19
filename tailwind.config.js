/** @type {import('tailwindcss').Config} */
module.exports = {
    prefix: 'upup-',
    important: '.upup-scope',
    content: ['./src/**/*.{tsx,ts,css}'],
    darkMode: 'class',
    theme: {
        extend: {
            containers: {
                cs: '475px',
            },
        },
    },
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    plugins: [require('@tailwindcss/container-queries')],
}
