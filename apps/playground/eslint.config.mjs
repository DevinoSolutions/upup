import tseslint from 'typescript-eslint'
import { reactHooksConfig, appEnvConfig } from '@upup/eslint-config'

export default tseslint.config(
    { ignores: ['.next/**', 'public/**', 'e2e/**', 'scripts/**'] },
    ...tseslint.configs.recommended,
    ...reactHooksConfig,
    // F-783: enforce the process.env ban (raw reads must go through src/lib/env.ts).
    ...appEnvConfig,
    {
        files: ['**/*.{ts,tsx}'],
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
            '@typescript-eslint/no-unused-expressions': 'off',
            'prefer-const': 'off',
        },
    },
    {
        files: ['**/*.config.{ts,mts,cts,js,cjs,mjs}'],
        rules: {
            '@typescript-eslint/no-require-imports': 'off',
        },
    },
)
