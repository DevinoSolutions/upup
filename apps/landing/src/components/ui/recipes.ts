/* Shared Tailwind class recipes for the landing UI. Single-source strings so
   the same treatment can't drift between components. */

/* Monochrome icon chip — one neutral treatment for every feature/section glyph.
   Size (height, width, corner radius) is supplied by the consumer. */
export const ICON_CHIP =
    'flex items-center justify-center border border-black/5 bg-black/[0.03] text-gray-600 dark:border-white/10 dark:bg-white/[0.05] dark:text-gray-400'
