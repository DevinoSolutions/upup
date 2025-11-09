import eslintJs from '@eslint/js';
import globals from 'globals';
import pluginReact from 'eslint-plugin-react';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: [
      'build/**',
      '.docusaurus/**',
      'docs/**',
      'blog/**',
      'static/**',
      '**/*.md',
      '**/*.mdx',
    ],
  },
  eslintJs.configs.recommended,
  ...tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: true,
        },
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      'react/react-in-jsx-scope': 'off',
    },
  },
];
