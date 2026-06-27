// Single source of truth for the cross-framework smoke. Each storybook runs on a
// fixed port (baked into its own `storybook` script) and exposes a
// `RealUploadClient` story (MSW disabled, serverUrl -> harness on :53060).
// Story id = <title kebab>--<export kebab>, e.g. React/Uploader + RealUploadClient
// -> "react-uploader--real-upload-client".

export interface FrameworkEntry {
  /** Playwright project name AND the `@upup/storybook-<name>` package suffix. */
  name: string
  /** Dev-server port (baked into the storybook package's own script). */
  port: number
  /** Storybook story id for the real-upload smoke. */
  storyId: string
  /** Story id for the deterministic DOM-parity fixture (autoUpload off). */
  parityStoryId: string
}

export const FRAMEWORKS: FrameworkEntry[] = [
  { name: 'react',   port: 53050, storyId: 'react-uploader--real-upload-client',   parityStoryId: 'react-uploader--parity' },
  { name: 'vue',     port: 53051, storyId: 'vue-uploader--real-upload-client',     parityStoryId: 'vue-uploader--parity' },
  { name: 'svelte',  port: 53052, storyId: 'svelte-uploader--real-upload-client',  parityStoryId: 'svelte-uploader--parity' },
  { name: 'vanilla', port: 53053, storyId: 'vanilla-uploader--real-upload-client', parityStoryId: 'vanilla-uploader--parity' },
  { name: 'angular', port: 53054, storyId: 'angular-uploader--real-upload-client', parityStoryId: 'angular-uploader--parity' },
  { name: 'preact',  port: 53055, storyId: 'preact-uploader--real-upload-client',  parityStoryId: 'preact-uploader--parity' },
]

/** All six storybook origins, comma-joined (for the harness CORS allowlist). */
export const ALL_STORYBOOK_ORIGINS = FRAMEWORKS.map(
  (f) => `http://localhost:${f.port}`,
).join(',')

/** Storybook preview URL for a story id (resolved against the project baseURL). */
export const storyUrl = (storyId: string) =>
  `/iframe.html?id=${storyId}&viewMode=story`

/** Look up a framework entry by Playwright project name. */
export function byName(name: string): FrameworkEntry {
  const entry = FRAMEWORKS.find((f) => f.name === name)
  if (!entry) throw new Error(`Unknown framework project: "${name}"`)
  return entry
}
