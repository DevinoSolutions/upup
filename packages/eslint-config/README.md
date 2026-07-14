Shared ESLint flat config for the publishable `@upupjs/*` packages. Import it from
a package's `eslint.config.mjs` (`import config from '@upupjs/eslint-config';
export default config;`). Phase 1 lints TS/JS only; framework templates are
deferred. Edit rules here — this is the single source of truth (mirrors
`@upupjs/tailwind-config`).

The react-family packages (`@upupjs/react`, `@upupjs/preact`) additionally compose
the named `reactHooksConfig` export (`export default [...config,
...reactHooksConfig]`) to lint real React hooks usage. It is **not** part of
the shared default: vue/svelte composables are also conventionally named
`use*`, so registering `react-hooks/rules-of-hooks` there would false-positive
across non-react packages.
