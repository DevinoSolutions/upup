/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./src/**/*.{tsx,ts,css}'],
    darkMode: 'class', // or 'media' or 'class'
    theme: {
        extend: {
            containers: {
                cs: '475px',
            },
        },
    },
    plugins: [require('@tailwindcss/container-queries')],
}
