import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';

/**
 * Shared flat ESLint config for the publishable @upup/* packages.
 * Phase 1: TS/JS sources only — framework-template linting (.vue/.svelte SFC
 * templates, Angular HTML) is deferred (see CLAUDE.md / F-167 phase 2).
 * Uses SYNTACTIC typescript-eslint recommended (NOT type-checked): no
 * per-package parserOptions.project wiring, so lint is fast and tsconfig-free.
 */
export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'storybook-static/**',
      '.next/**',
      '**/*.d.ts',
      '**/*.vue', // phase 2: eslint-plugin-vue
      '**/*.svelte', // phase 2: eslint-plugin-svelte
      '**/*.html', // phase 2: angular-eslint templates
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,js,jsx,mjs,cjs}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      // TODO(2026-07-04): ratchet to 'warn' next cycle (F-167 phase 2)
      '@typescript-eslint/no-explicit-any': 'off',
      // First-run triage (2026-07-04, F-167 Step 3): recommended's error-level
      // rules below flooded/misfired against legitimate patterns present across
      // the 9 packages (deliberate control-char sanitizer ranges, `true &&`/
      // `false &&` literal test fixtures for cn(), `try {} catch {}` intentional
      // error-swallowing, loosely-typed `Function` mocks in tests). Downgraded
      // to 'warn' pending a next-cycle pass; none were genuine defects — see
      // audit/fixes/P14-report.md for the per-occurrence triage transcript.
      // TODO(2026-07-04): ratchet these back to 'error' after a follow-up
      // pass narrows each to true positives (F-167 phase 2).
      'no-control-regex': 'warn',
      'no-constant-binary-expression': 'warn',
      'no-empty': 'warn',
      'prefer-const': 'warn',
      '@typescript-eslint/no-unsafe-function-type': 'warn',
      'no-extra-boolean-cast': 'warn',
    },
  },
  {
    // .cjs config files (postcss.config.cjs etc.) are intentionally CommonJS —
    // `require()`/`module.exports` there is correct, not a violation.
    // TODO(2026-07-04): revisit if any .cjs file grows enough logic to want
    // the rest of the ruleset re-enabled selectively (F-167 phase 2).
    files: ['**/*.cjs'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
);

/**
 * Opt-in react-hooks rules for the react-family packages (@upup/react,
 * @upup/preact) — NOT part of the shared default export. Vue/Svelte
 * composables are also conventionally named `use*`, so registering
 * react-hooks/rules-of-hooks in the shared default would false-positive
 * across those packages; react-family packages compose this in explicitly
 * instead (S3-D8 ruling, F-167 Step 3).
 */
export const reactHooksConfig = [
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      // TODO(2026-07-04): ratchet to 'error' in phase 2 (F-167)
      'react-hooks/rules-of-hooks': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
];
