// @vitest-environment node
/**
 * SSR regression tests for @upup/vue. Mirrors packages/react/tests/ssr.test.tsx
 * and packages/svelte/tests/root-ssr.test.ts: render UpupUploader through Vue's
 * server renderer (no DOM — no window/document/navigator.onLine/matchMedia) and
 * assert it does not throw and emits the expected shell markers. Vue skips
 * mount-only hooks (onMounted) during SSR, and the core's ThemeStore/orchestrator
 * already no-op without `window` (see theme-store.ts, uploader-orchestrator.ts),
 * so this should render cleanly.
 */
import { describe, it, expect } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { UpupUploader } from '../src'

describe('UpupUploader SSR', () => {
  it('renders without throwing under vue/server-renderer (no window/document)', async () => {
    const app = createSSRApp({
      render: () => h(UpupUploader, { sources: ['local'] }),
    })
    const html = await renderToString(app)
    expect(typeof html).toBe('string')
  })

  it('renders the container shell on the server', async () => {
    const app = createSSRApp({
      render: () => h(UpupUploader, { sources: ['local'] }),
    })
    const html = await renderToString(app)
    expect(html).toContain('data-testid="upup-container"')
    expect(html).toContain('upup-scope')
  })

  it('does not render the offline banner on SSR (isOnline defaults to true)', async () => {
    const app = createSSRApp({
      render: () => h(UpupUploader, { sources: ['local'] }),
    })
    const html = await renderToString(app)
    expect(html).not.toContain('No internet connection')
  })
})
