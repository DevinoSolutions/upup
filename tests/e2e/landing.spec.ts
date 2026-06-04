import { expect, test } from '@playwright/test'

test.describe('landing demo', () => {
  test('renders the React live demo and keeps other framework tabs code-only', async ({ page }) => {
    await page.goto('http://127.0.0.1:53000/#demo', { waitUntil: 'networkidle' })

    const liveRenderer = page.locator('[data-testid="landing-live-renderer"]')
    await expect(liveRenderer).toBeVisible()
    await expect(liveRenderer).toHaveAttribute('data-renderer', 'react')
    await expect(liveRenderer).toHaveAttribute('data-framework-target', 'react')
    await expect(liveRenderer.locator('[data-testid="upup-root"]')).toBeVisible()
    await expect(page.getByText('pnpm add @upup/react @upup/core')).toBeVisible()

    await page.locator('[data-testid="landing-framework-vue"]').click()
    await expect(liveRenderer).toHaveAttribute('data-renderer', 'react')
    await expect(liveRenderer).toHaveAttribute('data-framework-target', 'vue')
    await expect(page.getByText('pnpm add @upup/vue @upup/core')).toBeVisible()
    await expect(page.locator('[data-testid="landing-code-snippet"]')).toContainText('@upup/vue')

    await page.locator('[data-testid="landing-framework-vanilla"]').click()
    await expect(liveRenderer).toHaveAttribute('data-renderer', 'react')
    await expect(liveRenderer).toHaveAttribute('data-framework-target', 'vanilla')
    await expect(page.getByText('pnpm add @upup/core')).toBeVisible()
  })

  test('serves deterministic demo API routes', async ({ page }) => {
    await page.goto('http://127.0.0.1:53000/#demo', { waitUntil: 'networkidle' })

    const result = await page.evaluate(async () => {
      const sample = await fetch('/api/upup-demo/object/sample.txt')
      const sampleText = await sample.text()
      const presign = await fetch('/api/upup-demo/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'ci-demo.txt', size: 12 }),
      })
      const presignJson = await presign.json()
      const upload = await fetch(presignJson.uploadUrl, {
        method: 'PUT',
        body: 'hello world',
      })

      return {
        sampleOk: sample.ok,
        sampleBytes: sampleText.length,
        presignOk: presign.ok,
        key: presignJson.key,
        uploadOk: upload.ok,
      }
    })

    expect(result).toEqual({
      sampleOk: true,
      sampleBytes: 2480,
      presignOk: true,
      key: 'landing-demo/12-ci-demo.txt',
      uploadOk: true,
    })
  })

  test('uploads a local file through the live React demo', async ({ page }) => {
    await page.goto('http://127.0.0.1:53000/#demo', { waitUntil: 'networkidle' })

    const liveRenderer = page.locator('[data-testid="landing-live-renderer"]')
    await liveRenderer.locator('[data-testid="upup-file-input"]').setInputFiles({
      name: 'landing-ci-upload.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('landing ci upload'),
    })

    await expect(liveRenderer.getByText('landing-ci-upload.txt')).toBeVisible()
    await liveRenderer.getByRole('button', { name: /upload/i }).click()
    await expect(liveRenderer.locator('[data-testid="upup-root"]')).toHaveAttribute('data-state', 'successful')
    await expect(liveRenderer.getByRole('button', { name: /done/i })).toBeVisible()
  })

  test('keeps the demo usable without horizontal overflow on mobile width', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('http://127.0.0.1:53000/#demo', { waitUntil: 'networkidle' })

    const metrics = await page.locator('#demo').evaluate((demo) => ({
      demoScrollWidth: demo.scrollWidth,
      demoClientWidth: demo.clientWidth,
      bodyScrollWidth: document.documentElement.scrollWidth,
      bodyClientWidth: document.documentElement.clientWidth,
    }))

    expect(metrics.demoScrollWidth).toBeLessThanOrEqual(metrics.demoClientWidth + 1)
    expect(metrics.bodyScrollWidth).toBeLessThanOrEqual(metrics.bodyClientWidth + 1)
    await expect(page.locator('[data-testid="landing-live-renderer"] [data-testid="upup-root"]')).toBeVisible()
  })
})
