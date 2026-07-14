import { test, expect } from '@playwright/test'
import { byName, storyUrl } from './framework-matrix'

// Real-mount coverage for the preact/compat host's lazily-loaded real-React
// Filerobot island (see CLAUDE.md "The image editor is react/preact-only").
// filerobot-bridge.spec.tsx mocks the loader, so the real dynamic
// import('./filerobot-island.js'), the real Filerobot bundle, and the real
// browser mount are otherwise never exercised end-to-end. Mirrors the react
// pattern in playground-deep.spec.ts ("modal image editor lazy-loads...").
test.describe('preact real-React filerobot island', () => {
  test('mounts the real island when the modal editor auto-opens', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'preact', 'preact-only: real-React island in preact/compat host')
    byName(testInfo.project.name) // asserts the project is known

    await page.goto(storyUrl('preact-image-editor--modal'))
    await expect(page.locator('[data-testid="upup-root"]')).toBeVisible({ timeout: 30_000 })

    // sources:['local'] -> the file input exists; adding an image triggers autoOpen:'always'.
    await page.locator('[data-testid="upup-file-input"]').first().setInputFiles({
      name: 'island.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        'base64',
      ),
    })

    const dialog = page.getByRole('dialog', { name: /edit image/i })
    await expect(dialog).toBeVisible({ timeout: 30_000 })
    // The real island renders Filerobot's canvas editor -- the preact shell alone would not.
    await expect(dialog.locator('canvas').first()).toBeVisible({ timeout: 30_000 })
  })
})
