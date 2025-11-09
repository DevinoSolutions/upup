/** @type {import('tailwindcss').Config} */

module.exports = {
    darkMode: 'class',
    content: [
        './src/**/*.{js,jsx,ts,tsx,css}'
    ],
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
                    "0%": { opacity: "0" },
                    "100%": { opacity: "1" },
                },
                fadeInUp: {
                    "0%": { opacity: "0", transform: "translateY(20px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
            },
            animation: {
                fadeIn: "fadeIn 0.5s ease-out forwards",
                fadeInUp: "fadeInUp 0.5s ease-out forwards",
                'bounce-slow': 'bounceSlow 2s infinite',
            },
            colors: {
                primary: {
                    DEFAULT: "#1849d6", // indigo-600
                    dark: "#37c4f5",
                },
                bg: {
                    DEFAULT: '#fff',
                    dark: "#242526",
                }
            },
        },
    },
    plugins: [require('@tailwindcss/forms'), require('tailwindcss-elevation'), require('@tailwindcss/typography')],
}
