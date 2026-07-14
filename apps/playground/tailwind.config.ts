/** @type {import('tailwindcss').Config} */

module.exports = {
    darkMode: 'class',
    content: [
        './src/**/*.{js,jsx,ts,tsx,css}',
        // Pull preset class strings out of the playground primitives package
        // so Tailwind compiles them into the bundle. Without this, slot
        // override presets (and any class strings written into config at
        // runtime) wouldn't appear in the compiled CSS, and applying them
        // to the uploader would render no visible change.
        '../../packages/interactive-example/src/**/*.{ts,tsx}',
    ],
    // @upupjs/react's preflight resets `border: 0` on every
    // descendant of `.upup-scope` (selector specificity 0,1,1). Without
    // !important on our utilities, slot-override classes like `.border`
    // (specificity 0,1,0) lose the cascade and render no visible change.
    // Marking utilities important lets the playground demo actually
    // demo — without affecting the published package.
    important: true,
    theme: {
        extend: {
            keyframes: {
                bounceSlow: {
                    '0%, 100%': {
                        transform: 'translateY(-15%)',
                        animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)',
                    },
                    '50%': {
                        transform: 'translateY(0)',
                        animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)',
                    },
                },
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                fadeInUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
            },
            animation: {
                fadeIn: 'fadeIn 0.5s ease-out forwards',
                fadeInUp: 'fadeInUp 0.5s ease-out forwards',
                'bounce-slow': 'bounceSlow 2s infinite',
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
        require('@tailwindcss/typography'),
    ],
}
