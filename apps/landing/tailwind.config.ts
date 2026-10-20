/** @type {import('tailwindcss').Config} */

const defaultTheme = require('tailwindcss/defaultTheme')

module.exports = {
    darkMode: 'class',
    content: ['./src/**/*.{js,jsx,ts,tsx,css}', './content/docs/**/*.mdx'],
    theme: {
        extend: {
            // next/font/google (app/layout.tsx) stamps these variables on
            // <body>; font-sans / font-mono resolve to Geist with the stock
            // Tailwind stacks as fallback.
            fontFamily: {
                sans: [
                    'var(--font-geist-sans)',
                    ...defaultTheme.fontFamily.sans,
                ],
                mono: [
                    'var(--font-geist-mono)',
                    ...defaultTheme.fontFamily.mono,
                ],
            },
            // Motion tokens live as --motion-* custom properties on :root
            // (app/globals.css). Use them via duration-fast/base/slow and
            // ease-motion-out/in; the animate-motion-* utilities below bake in
            // the same tokens. Gate every use with `motion-safe:` and pair it
            // with `motion-reduce:animate-motion-fade` where an opacity-only
            // fallback is wanted (reduced mode = no translate/scale).
            transitionDuration: {
                fast: 'var(--motion-dur-fast)',
                base: 'var(--motion-dur-base)',
                slow: 'var(--motion-dur-slow)',
                panel: 'var(--motion-dur-panel)',
            },
            transitionTimingFunction: {
                'motion-out': 'var(--motion-ease-out)',
                'motion-in': 'var(--motion-ease-in)',
            },
            keyframes: {
                'motion-enter': {
                    '0%': { opacity: '0', transform: 'translateY(6px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                'motion-enter-down': {
                    '0%': { opacity: '0', transform: 'translateY(-8px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                'motion-fade': {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                'motion-panel': {
                    '0%': {
                        opacity: '0',
                        transform: 'translateY(8px) scale(0.98)',
                    },
                    '100%': {
                        opacity: '1',
                        transform: 'translateY(0) scale(1)',
                    },
                },
            },
            animation: {
                'motion-enter':
                    'motion-enter var(--motion-dur-base) var(--motion-ease-out) backwards',
                'motion-enter-down':
                    'motion-enter-down var(--motion-dur-base) var(--motion-ease-out) backwards',
                'motion-fade':
                    'motion-fade var(--motion-dur-fast) var(--motion-ease-out) backwards',
                'motion-panel':
                    'motion-panel var(--motion-dur-panel) var(--motion-ease-out) backwards',
            },
            colors: {
                primary: {
                    DEFAULT: '#1849d6', // indigo-600
                    dark: '#37c4f5',
                },
                bg: {
                    DEFAULT: '#fff',
                    dark: '#242526',
                },
            },
        },
    },
    plugins: [
        require('@tailwindcss/forms'),
        require('tailwindcss-elevation'),
        require('@tailwindcss/typography'),
    ],
}
