// Shared Vite tweaks for the storybook apps. One file, six consumers — a
// per-app copy of any rule here is a defect (same rule as tailwind-config).
//
// Typed structurally rather than against vite's own `UserConfig`: this package
// deliberately has no vite dependency (its other modules are browser-side story
// helpers), and `viteFinal` hands us a config object whose shape we only need
// to narrow, not reconstruct. The generic passes the caller's own config type
// straight back, so each framework's `StorybookConfig['viteFinal']` return type
// still checks.

type ViteWorkerOptions = {
    format?: 'es' | 'iife'
    [option: string]: unknown
}

type ViteConfigWithWorker = {
    worker?: ViteWorkerOptions
    [option: string]: unknown
}

/**
 * Force ES output for worker bundles.
 *
 * `@upupjs/core`'s pipeline worker is a MODULE worker — `runtime/browser.ts`
 * spawns it as `new Worker(new URL('./pipeline-worker.js', import.meta.url),
 * { type: 'module' })` — and vite's `vite:worker-import-meta-url` plugin picks
 * that `new URL(...)` up out of core's built dist and bundles the worker as its
 * own rollup build. Vite's default `worker.format` is `'iife'`, and a worker
 * graph that code-splits (core's does: the pipeline steps are dynamic imports)
 * cannot be emitted as IIFE, so a production `storybook build` dies with
 * "Invalid value \"iife\" for option \"worker.format\"". `'es'` both permits the
 * split and matches the `type: 'module'` the runtime actually requests.
 *
 * Dev-mode storybook never hits this — only the code-splitting production build
 * does, which is why this stayed invisible to every PR gate until the nightly
 * static builds were promoted into e2e.yml.
 */
export function withUpupViteWorkerFormat<T extends ViteConfigWithWorker>(
    config: T,
): T {
    config.worker = { ...config.worker, format: 'es' }
    return config
}
