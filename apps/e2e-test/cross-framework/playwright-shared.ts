import { FRAMEWORKS } from './framework-matrix'

/** One Playwright project per framework, baseURL = its storybook origin. */
export const frameworkProjects = () =>
    FRAMEWORKS.map(fw => ({
        name: fw.name,
        use: { baseURL: `http://localhost:${fw.port}` },
    }))

// One dev server per storybook. The port is baked into each package's own
// `storybook` script; reuseExistingServer lets a local dev keep theirs running.
// All six Storybook dev servers cold-start concurrently (each runs its own vite
// dependency prebundle), contending for CPU on a laptop or CI runner. A single
// warm start is fast, but six cold ones together can exceed three minutes, so the
// per-server bind timeout is generous. Playwright only waits for the slowest, and
// a warm `reuseExistingServer` start is instant — so this ceiling costs nothing
// on the happy path; it only prevents a premature cold-start failure. 420 s
// proved too tight on a cold 2-core CI runner and 660 s on a loaded dev box
// (2026-07-13: angular's webpack hit 100% at the buzzer and never bound), so
// the ceiling is 900 s — it costs nothing unless a boot is genuinely wedged.
export const frameworkWebServers = () =>
    FRAMEWORKS.map(fw => ({
        command: `pnpm --filter @useupup/storybook-${fw.name} storybook`,
        port: fw.port,
        reuseExistingServer: true,
        timeout: 900_000,
    }))
