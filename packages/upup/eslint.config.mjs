import { includeIgnoreFile } from '@eslint/compat'
import pluginJs from '@eslint/js'
import configPrettier from 'eslint-config-prettier' // Import the Prettier config
import pluginPrettier from 'eslint-plugin-prettier'
import { default as pluginReact } from 'eslint-plugin-react'
import pluginReactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import path from 'path'
import tseslint from 'typescript-eslint'
const gitignorePath = path.resolve('./.gitignore')

/** @type {import('eslint').Linter.Config[]} */
export default [
    includeIgnoreFile(gitignorePath),
    {
        // files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'],
        files: ['**/*.{ts,tsx}'],
    },
    {
        languageOptions: {
            globals: { ...globals.browser, ...globals.node },
            parserOptions: {
                ecmaFeatures: { jsx: true },
            },
        },
        settings: {
            react: { version: 'detect' },
        },
    },
    pluginJs.configs.recommended,
    ...tseslint.configs.recommended,
    pluginReact.configs.flat.recommended,
    {
        plugins: {
            'react-hooks': pluginReactHooks,
            prettier: pluginPrettier,
        },
        rules: {
            'react-hooks/rules-of-hooks': 'error', // Checks rules of Hooks
            'react-hooks/exhaustive-deps': 'warn', // Checks effect dependencies
            'prettier/prettier': ['warn', { endOfLine: 'auto' }], // Show Prettier errors as warnings and auto EOL
            '@typescript-eslint/no-explicit-any': 'off',
        },
    },
    configPrettier, // Disable ESLint rules that conflict with Prettier
]
