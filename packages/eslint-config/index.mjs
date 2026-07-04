import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

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
    },
  },
);
