/** @type {import('tailwindcss').Config} */
// Utilities only — the uploader ships its own scoped preflight. preflight:false
// avoids resetting Storybook's own UI. important:true lets slot-override classes
// win over the uploader's `.upup-scope` border reset (same rationale as the
// playground's tailwind.config.ts). safelist covers preset class strings used in
// Appearance stories that Tailwind can't see statically.
module.exports = {
  darkMode: 'class',
  important: true,
  corePlugins: { preflight: false },
  content: ['./src/**/*.{ts,tsx,mdx}'],
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
