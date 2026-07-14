/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  important: true,
  corePlugins: { preflight: false },
  content: ['./src/**/*.{ts,vue,mdx}'],
  safelist: [
    'rounded-2xl', 'shadow-md', 'shadow-lg', 'border',
    'bg-indigo-600', 'hover:bg-indigo-700', 'text-white',
    'bg-emerald-600', 'hover:bg-emerald-700',
    'bg-gradient-to-r', 'from-cyan-400', 'to-blue-500',
    'max-w-2xl', 'mx-auto', 'w-full', 'ring-2', 'ring-slate-300',
  ],
  theme: { extend: {} },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')],
}
