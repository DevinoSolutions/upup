// Single source of truth for the cross-framework smoke. Each storybook runs on a
// fixed port (baked into its own `storybook` script) and exposes a
// `RealUploadClient` story (MSW disabled, serverUrl -> harness on :53060).
// Story id = <title kebab>--<export kebab>, e.g. React/Uploader + RealUploadClient
// -> "react-uploader--real-upload-client".
//
// Adding a variant/density: add the variant to PARITY_VARIANTS, add a
// `<fw>-uploader--<variant>` story per framework, regen the parity fixtures
// for that variant (`UPDATE_PARITY=1` + `--project react`, review the diff),
// run the 4b overflow sweep for that variant, and do a live per-framework
// visual check (the harness catches DOM structure, never geometry/spacing).

/** UI variants the parity + overflow harnesses are keyed by. */
export type ParityVariant = 'default'
export const PARITY_VARIANTS: readonly ParityVariant[] = ['default']

export interface FrameworkEntry {
    /** Playwright project name AND the `@upupjs/storybook-<name>` package suffix. */
    name: string
    /** Dev-server port (baked into the storybook package's own script). */
    port: number
    /** Storybook story id for the real-upload smoke. */
    storyId: string
    /** Story id for the deterministic DOM-parity fixture (autoUpload off), per variant. */
    parityStoryIds: Record<ParityVariant, string>
}

export const FRAMEWORKS: FrameworkEntry[] = [
    {
        name: 'react',
        port: 53050,
        storyId: 'react-uploader--real-upload-client',
        parityStoryIds: { default: 'react-uploader--parity' },
    },
    {
        name: 'vue',
        port: 53051,
        storyId: 'vue-uploader--real-upload-client',
        parityStoryIds: { default: 'vue-uploader--parity' },
    },
    {
        name: 'svelte',
        port: 53052,
        storyId: 'svelte-uploader--real-upload-client',
        parityStoryIds: { default: 'svelte-uploader--parity' },
    },
    {
        name: 'vanilla',
        port: 53053,
        storyId: 'vanilla-uploader--real-upload-client',
        parityStoryIds: { default: 'vanilla-uploader--parity' },
    },
    {
        name: 'angular',
        port: 53054,
        storyId: 'angular-uploader--real-upload-client',
        parityStoryIds: { default: 'angular-uploader--parity' },
    },
    {
        name: 'preact',
        port: 53055,
        storyId: 'preact-uploader--real-upload-client',
        parityStoryIds: { default: 'preact-uploader--parity' },
    },
]

/** All six storybook origins, comma-joined (for the harness CORS allowlist). */
export const ALL_STORYBOOK_ORIGINS = FRAMEWORKS.map(
    f => `http://localhost:${f.port}`,
).join(',')

/** Storybook preview URL for a story id (resolved against the project baseURL). */
export const storyUrl = (storyId: string) =>
    `/iframe.html?id=${storyId}&viewMode=story`

/** Look up a framework entry by Playwright project name. */
export function byName(name: string): FrameworkEntry {
    const entry = FRAMEWORKS.find(f => f.name === name)
    if (!entry) throw new Error(`Unknown framework project: "${name}"`)
    return entry
}
