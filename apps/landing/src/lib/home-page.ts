// The home page's title and description, in one place, because two surfaces
// read them: the page's <head> (src/app/page.tsx) and its Markdown twin
// (src/lib/home-markdown.ts, served at /index.md).
//
// Title is brand-first and ≤60 chars ("upup" is the site's biggest query and
// the old 77-char title truncated in SERPs); description is ≤155 so it renders
// whole. Both budgets are pinned by src/__tests__/seo-copy-budgets.test.ts.
export const HOME_TITLE = 'upup – Open-Source File Uploader | npm @useupup'

export const HOME_DESCRIPTION =
    'upup is a free, MIT-licensed file uploader on npm as @useupup. Drag and drop UI for React, Vue, Svelte, Angular, Vanilla JS and Preact, with S3 uploads.'

/**
 * Where the home page's Markdown twin lives (src/app/index.md/route.ts). `/`
 * cannot take a `.md` suffix, so the twin has its own URL; `/` asked for with
 * `Accept: text/markdown` is rewritten here too. next.config.mjs cannot import
 * from src, so it repeats this literal; src/__tests__/agent-surface.test.ts
 * pins the two together.
 */
export const HOME_MARKDOWN_PATH = '/index.md'
