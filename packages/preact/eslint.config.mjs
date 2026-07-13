import config, {
    reactHooksConfig,
    disableTypeChecked,
} from '@upupjs/eslint-config'

export default [
    ...config,
    ...reactHooksConfig,
    {
        // The Filerobot island is a real-React island built by tsconfig.island.json
        // (jsxImportSource: react), deliberately excluded from the main preact
        // tsconfig — so ESLint's projectService (which uses tsconfig.json) can't
        // type it. Lint it syntactically; no-explicit-any / no-silent-catch still fire.
        files: ['src/filerobot-island.tsx'],
        ...disableTypeChecked,
    },
]
