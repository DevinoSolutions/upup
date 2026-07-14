/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{ts,html}',
    '../../packages/angular/src/**/*.{ts,html}',
    '../../packages/storybook-config/src/**/*.ts',
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
