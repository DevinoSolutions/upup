// @vitest-environment node
/**
 * ssr.spec.tsx — SSR regression tests for @upup/preact
 *
 * Mirrors packages/react/tests/ssr.test.tsx. Renders the compat component with
 * preact-render-to-string in a pure Node environment (no jsdom — no window,
 * document, or navigator at all) to prove the compiled-on-preact/compat output
 * is safe to render on the server. Does NOT re-test @upup/react logic (659
 * tests cover that).
 *
 * Markers verified against react source (see render.spec.tsx for the full map):
 *   upup-root                              → packages/react/src/upup-uploader.tsx:66
 *   upup-container                         → packages/react/src/upup-uploader.tsx:81
 *   data-upup-slot="adapter-selector"      → packages/react/src/components/SourceSelector.tsx:139
 *   "No internet connection" (offline banner) → packages/react/src/components/MainBox.tsx:77
 *   data-theme                             → packages/react/src/theme/UpupThemeProvider.tsx:39
 */

import { renderToString } from 'preact-render-to-string'
import { describe, expect, test } from 'vitest'
import { UpupUploader } from './index'

describe('@upup/preact SSR (preact-render-to-string, no window/document)', () => {
  test('renders without throwing', () => {
    expect(() => renderToString(<UpupUploader />)).not.toThrow()
  })

  test('renders the root + container shell', () => {
    const html = renderToString(<UpupUploader />)
    expect(html).toContain('data-testid="upup-root"')
    expect(html).toContain('data-testid="upup-container"')
  })

  test('renders the adapter selector on SSR (online branch)', () => {
    const html = renderToString(<UpupUploader />)
    expect(html).toContain('data-upup-slot="adapter-selector"')
  })

  test('does not render the offline banner on SSR (isOnline defaults to true)', () => {
    const html = renderToString(<UpupUploader />)
    expect(html).not.toContain('No internet connection')
  })

  test('renders a deterministic data-theme on SSR when mode is system', () => {
    const html = renderToString(<UpupUploader />)
    expect(html).toContain('data-theme="light"')
    expect(html).not.toContain('data-theme="dark"')
  })
})
