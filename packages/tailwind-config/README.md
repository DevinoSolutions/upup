# @upup/tailwind-config

Shared PostCSS/Tailwind config factory for the upup UI packages (`@upup/react`,
`@upup/vue`, `@upup/svelte`, `@upup/vanilla`, `@upup/angular`).

Private, source-only, never published — consumed directly across the workspace
(same pattern as `@upup/storybook-config`). CommonJS, because PostCSS configs are `.cjs`.

## What it provides

`createPostcssConfig({ content })` returns the `{ plugins: [...] }` object every
upup UI package feeds to `postcss-cli`. It bundles the entire shared CSS pipeline:

- `tailwindcss` — `upup-` prefix, `class` dark mode, preflight on, the shared
  `theme.extend` (the `cs` container, the `informer-in` keyframes/animation), and
  the `@tailwindcss/container-queries` plugin.
- `postcss-prefix-selector` — scopes every rule under `.upup-scope` (idempotent:
  never double-prefixes an already-scoped selector, so re-processed `dist` CSS is safe).
- `autoprefixer`.

The shared `@upup/core` icon-registry path (`../core/src/icons/registry.ts`) is
appended to `content` internally, so consumers pass only their own source globs.

## Usage

Each consumer's `postcss.config.cjs` is one line — only `content` differs:

```js
module.exports = require('@upup/tailwind-config').createPostcssConfig({
    content: ['./src/**/*.{tsx,ts,css}'], // react
})
```

| package | content |
|---------|---------|
| react   | `['./src/**/*.{tsx,ts,css}']` |
| vue     | `['./src/**/*.{vue,ts,css}']` |
| svelte  | `['./src/**/*.{svelte,ts,css}']` |
| vanilla | `['./src/**/*.{ts,css}']` |
| angular | `['./src/**/*.{ts,css,html}']` |

## The single knob: `content`

`content` is the per-framework source-file glob set — the only thing that varies
across the five packages. Everything else lives in `postcss.cjs`, so a shared-theme
change is a one-file edit here.
