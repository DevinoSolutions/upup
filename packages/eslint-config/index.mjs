import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import comments from '@eslint-community/eslint-plugin-eslint-comments/configs'
import oxlint from 'eslint-plugin-oxlint'
import upup from './rules/index.mjs'

/**
 * Shared flat ESLint config for the publishable @upup/* packages — v2.
 * v2 (2026-07-06 quality gates): TYPE-AWARE via projectService; oxlint runs
 * first as the fast line (built-ins only — R3), eslint-plugin-oxlint disables
 * the overlap here; all custom/audit-derived rules live in this file + the
 * local eslint-plugin-upup. Framework-template linting (.vue/.svelte SFC,
 * Angular HTML) remains deferred (F-167 phase 2 — unchanged scope).
 *
 * Adaptation notes (see 2026-07-06 quality-gates report, Task 4):
 * - `eslint .` runs per-package (cwd = package dir), so `projectService` roots
 *   at `process.cwd()` and the scope-specific layers (core/server) live in the
 *   `coreConfig`/`serverConfig` named exports composed by those packages'
 *   `eslint.config.mjs` — a `packages/core/src/**` glob would never match the
 *   `src/...` path ESLint actually sees.
 * - Type-aware rules are scoped to TS/TSX source (the only in-tsconfig source);
 *   JS/`.mjs`/`.cjs`/config files and out-of-`src` test files get
 *   `disableTypeChecked` so an out-of-project file is linted syntactically
 *   rather than erroring. `no-explicit-any` (syntactic, R1) and
 *   `upup/no-silent-catch` (AST) still fire on those files.
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
            '**/*.vue',
            '**/*.svelte',
            '**/*.html',
        ],
    },
    js.configs.recommended,
    ...tseslint.configs.strictTypeChecked,
    comments.recommended,
    {
        // ---- type-aware layer: TS source only (in the package tsconfig) ----
        files: ['**/*.{ts,tsx}'],
        languageOptions: {
            globals: { ...globals.browser, ...globals.node },
            parserOptions: {
                projectService: true,
                tsconfigRootDir: process.cwd(),
            },
        },
        plugins: { upup },
        rules: {
            // ---- suppression audit: every disable is justified and bounded ----
            '@eslint-community/eslint-comments/require-description': [
                'error',
                { ignore: [] },
            ],
            '@eslint-community/eslint-comments/no-unlimited-disable': 'error',
            '@eslint-community/eslint-comments/no-unused-disable': 'error',
            '@typescript-eslint/ban-ts-comment': [
                'error',
                {
                    'ts-expect-error': { descriptionFormat: '^: .+$' },
                    'ts-ignore': true,
                    'ts-nocheck': true,
                },
            ],

            // ---- any is dead; unknown per ruling R1 ----
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/explicit-module-boundary-types': 'error',

            // ---- errors are loud (Sentry visibility) ----
            'upup/no-silent-catch': 'error',
            '@typescript-eslint/no-floating-promises': 'error',
            '@typescript-eslint/no-misused-promises': 'error',
            '@typescript-eslint/await-thenable': 'error',
            '@typescript-eslint/only-throw-error': 'error',
            '@typescript-eslint/prefer-promise-reject-errors': 'error',
            'no-empty': ['error', { allowEmptyCatch: false }],
            'no-console': ['error', { allow: ['warn', 'error'] }],

            // ---- correctness the audit paid for ----
            '@typescript-eslint/switch-exhaustiveness-check': 'error',
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                },
            ],
            '@typescript-eslint/no-unnecessary-condition': 'warn', // noisy: ratchet after burn-down
            '@typescript-eslint/restrict-template-expressions': [
                'warn',
                { allowNumber: true, allowBoolean: true },
            ],

            // ---- F-167 phase-2 ratchet: the parked warns come back to error ----
            'no-control-regex': 'error',
            'no-constant-binary-expression': 'error',
            'prefer-const': 'error',
            '@typescript-eslint/no-unsafe-function-type': 'error',
            'no-extra-boolean-cast': 'error',

            // ---- architecture bans (audit rulings, selector-expressible) ----
            'no-restricted-syntax': [
                'error',
                // P6: ONE upload-failure channel — bare 'error' emit is retired
                {
                    selector:
                        "CallExpression[callee.property.name='emit'][arguments.0.value='error']",
                    message:
                        "Bare 'error' event is retired (P6): route upload failures through 'upload-error' (HEIC diagnostics: 'pipeline-error'; drive plugins: '<provider>:error').",
                },
                // N3: retired lifecycle verbs / aliases must not return
                {
                    selector:
                        'MethodDefinition[key.name=/^(dispose|teardown)$/]',
                    message:
                        'Lifecycle verb is destroy() everywhere — dispose/teardown were retired in N3.',
                },
                {
                    selector:
                        'Identifier[name=/^(MainBox|useRootProvider|ShouldRender|composeEnhancers|gzipStep|deduplicateStep|ServerOAuth|OAuthStrategy)$/]',
                    message:
                        'Retired name (N1/N3/P16 or Tier-3.2 cull) — see CLAUDE.md naming vocabulary. KEEP-list (legal): RuntimeAdapter, RootArg, RootFolder, getRootProps.',
                },
                {
                    selector: "Property[key.name='onFileRemove']",
                    message:
                        'onFileRemove alias is dead (N3) — the callback is onFileRemoved (past tense).',
                },
                // N4: DOM contract is the source vocabulary
                {
                    selector:
                        'Literal[value=/upup-adapter-|adapter-view|adapter-click|data-upup-slot=\\"adapter/]',
                    message:
                        'Adapter DOM vocabulary was swept to source-* in N4 — a rename here is a cross-framework breaking change; see CLAUDE.md.',
                },
                {
                    selector: 'Literal[value=/main-box/]',
                    message:
                        'main-box DOM vocabulary was swept to uploader-panel (slot value; upup-uploader-panel / upup-uploader-header Angular selectors) — a rename here is a cross-framework breaking change; see CLAUDE.md.',
                },
            ],
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: ['@upup/*/src/*', '**/packages/*/src/**'],
                            message:
                                "Packages consume each other's dist/, never src/ (principle 5). Use the package entry or its public subpaths.",
                        },
                    ],
                    paths: [
                        {
                            name: 'libheif-js',
                            message:
                                'Heavy dep — dynamic import() behind @upup/core/steps/heic only (principle 6).',
                        },
                        {
                            name: 'tus-js-client',
                            message:
                                'Heavy dep — dynamic import() behind @upup/core/strategies/tus-upload only (principle 6).',
                        },
                    ],
                },
            ],
        },
    },
    {
        // ---- JS / config / .mjs / .cjs: not in any tsconfig — lint syntactically ----
        files: ['**/*.{js,cjs,mjs,jsx}', '**/*.config.{ts,mts,cts}'],
        ...tseslint.configs.disableTypeChecked,
        languageOptions: {
            ...tseslint.configs.disableTypeChecked.languageOptions,
            globals: { ...globals.browser, ...globals.node },
        },
    },
    {
        // ---- tests: same taste, relaxed ergonomics — but any/silent-catch stay banned.
        // Out-of-`src` test dirs aren't in the build tsconfig, so type-aware rules
        // are disabled here (honest per adaptation note a); `no-explicit-any` (R1)
        // and `upup/no-silent-catch` are syntactic/AST and still fire. ----
        files: [
            '**/*.test.{ts,tsx}',
            '**/*.spec.{ts,tsx}',
            '**/tests/**',
            '**/__tests__/**',
        ],
        ...tseslint.configs.disableTypeChecked,
        rules: {
            ...tseslint.configs.disableTypeChecked.rules,
            '@typescript-eslint/explicit-module-boundary-types': 'off',
            '@typescript-eslint/no-unnecessary-condition': 'off',
            '@typescript-eslint/restrict-template-expressions': 'off',
            'no-console': 'off',
            '@typescript-eslint/unbound-method': 'off',
            '@typescript-eslint/no-non-null-assertion': 'off',
        },
    },
    {
        files: ['**/*.cjs'],
        rules: { '@typescript-eslint/no-require-imports': 'off' },
    },
    // oxlint runs the overlapping built-ins — disable them here LAST so nothing double-reports
    ...oxlint.configs['flat/recommended'],
    {
        // oxlint's flat/recommended disables `@typescript-eslint/no-unused-vars` (it
        // owns `no-unused-vars` on the fast line). We parked that at `warn` in oxlint
        // and enforce unused-vars in ESLint, so re-assert it here AFTER the disable.
        files: ['**/*.{ts,tsx}'],
        rules: {
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                },
            ],
        },
    },
)

/**
 * The typescript-eslint "disable type-checked" config object, re-exported so a
 * consumer package can lint a genuinely out-of-project source file syntactically
 * without depending on typescript-eslint directly. Used by @upup/preact for its
 * real-React Filerobot island (built by tsconfig.island.json, deliberately
 * excluded from the main preact tsconfig — so projectService can't type it).
 * `no-explicit-any` (R1) and `upup/no-silent-catch` still fire on such files.
 */
export const disableTypeChecked = tseslint.configs.disableTypeChecked

/**
 * Opt-in react-hooks rules for @upup/react + @upup/preact — NOT in the shared
 * default (vue/svelte composables are also named use* and would false-positive).
 * v2: ratcheted warn -> error (F-167 phase 2 done).
 */
export const reactHooksConfig = [
    {
        files: ['**/*.{ts,tsx,js,jsx}'],
        plugins: { 'react-hooks': reactHooks },
        rules: {
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'error',
        },
    },
]

/**
 * @upup/core scope layer — core is framework-free and its errors use the
 * taxonomy. Composed by `packages/core/eslint.config.mjs` (package-relative
 * `src/**` glob, since `eslint .` runs with cwd = the package dir).
 */
export const coreConfig = [
    {
        files: ['src/**/*.ts'],
        rules: {
            'upup/require-error-taxonomy': 'error',
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: [
                                'react',
                                'react-*',
                                'vue',
                                'svelte',
                                'svelte/*',
                                '@angular/*',
                                'preact',
                                'preact/*',
                            ],
                            message:
                                '@upup/core has ZERO framework dependencies — keep it that way.',
                        },
                        {
                            group: ['@upup/core', '@upup/core/*'],
                            message:
                                'Do not import the public barrel from inside core (cycle risk) — use relative imports.',
                        },
                        {
                            group: ['@upup/*/src/*', '**/packages/*/src/**'],
                            message:
                                'Packages consume dist/, never src/ (principle 5).',
                        },
                    ],
                    paths: [
                        {
                            name: 'libheif-js',
                            message:
                                'Dynamic import() behind steps/heic only (principle 6).',
                        },
                        {
                            name: 'tus-js-client',
                            message:
                                'Dynamic import() behind strategies/tus-upload only (principle 6).',
                        },
                    ],
                },
            ],
        },
    },
]

/**
 * App env-validation enforcement — bans raw process.env reads outside the
 * validated env module (src/lib/env.ts) and config files. Composed by each
 * app's eslint.config.mjs after Task 9 (F-708/F-709) wires them to the
 * shared config.
 */
export const appEnvConfig = [
    {
        files: ['src/**/*.{ts,tsx}'],
        ignores: ['**/env.ts', '**/*.config.*'],
        rules: {
            'no-restricted-syntax': [
                'error',
                {
                    selector:
                        "MemberExpression[object.object.name='process'][object.property.name='env']",
                    message:
                        "Read env through the app's validated env module (src/lib/env.ts), not process.env directly.",
                },
            ],
        },
    },
]

/**
 * @upup/server scope layer — errors use the taxonomy; respond.ts is the single
 * CORS-safe response home (P15), so a raw `new Response()` anywhere else is a
 * defect. Composed by `packages/server/eslint.config.mjs`.
 */
export const serverConfig = [
    {
        files: ['src/**/*.ts'],
        ignores: ['src/respond.ts', 'src/health.ts'],
        rules: {
            'upup/require-error-taxonomy': 'error',
            'no-restricted-syntax': [
                'error',
                {
                    selector: "NewExpression[callee.name='Response']",
                    message:
                        'P15: respond.ts is the single CORS-safe response home — a raw new Response() here loses CORS headers + x-upup-request-id. Return through the Responder.',
                },
            ],
        },
    },
]
