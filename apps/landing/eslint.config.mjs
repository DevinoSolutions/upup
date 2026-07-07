import tseslint from 'typescript-eslint';
import { reactHooksConfig } from '@upup/eslint-config';

export default tseslint.config(
  { ignores: ['.next/**', 'public/**'] },
  ...tseslint.configs.recommended,
  ...reactHooksConfig,
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
);
