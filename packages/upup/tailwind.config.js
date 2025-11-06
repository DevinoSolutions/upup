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
        },
    },
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    plugins: [require('@tailwindcss/container-queries')],
}
