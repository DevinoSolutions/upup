Shared ESLint flat config for the publishable `@upup/*` packages. Import it from
a package's `eslint.config.mjs` (`import config from '@upup/eslint-config';
export default config;`). Phase 1 lints TS/JS only; framework templates are
deferred. Edit rules here — this is the single source of truth (mirrors
`@upup/tailwind-config`).
