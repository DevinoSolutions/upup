import { expect, test } from '@playwright/test'

const frameworkStorybooks = [
  { name: 'Vanilla', baseUrl: 'http://127.0.0.1:6009', storyId: 'vanilla-upupuploader--basic' },
  { name: 'Next', baseUrl: 'http://127.0.0.1:6015', storyId: 'next-upupuploader--basic' },
  { name: 'Preact', baseUrl: 'http://127.0.0.1:6010', storyId: 'preact-upupuploader--basic' },
  { name: 'Solid', baseUrl: 'http://127.0.0.1:6011', storyId: 'solid-upupuploader--basic' },
  { name: 'Svelte', baseUrl: 'http://127.0.0.1:6012', storyId: 'svelte-upupuploader--basic' },
  { name: 'Qwik', baseUrl: 'http://127.0.0.1:6013', storyId: 'qwik-upupuploader--basic' },
  { name: 'Angular', baseUrl: 'http://127.0.0.1:6014', storyId: 'angular-upupuploader--basic' },
] as const

function storyUrl(baseUrl: string, storyId: string) {
  return `${baseUrl}/iframe.html?id=${storyId}&viewMode=story`
}

for (const storybook of frameworkStorybooks) {
  test(`${storybook.name} Storybook renders and uploads through its package host`, async ({ page }) => {
    await page.goto(storyUrl(storybook.baseUrl, storybook.storyId), { waitUntil: 'domcontentloaded' })

    const root = page.locator('[data-testid="upup-root"]').first()
    await expect(root).toBeVisible()

    const fileName = `${storybook.name.toLowerCase()}-storybook-e2e.txt`
    await page.locator('[data-testid="upup-file-input"]').first().setInputFiles({
      name: fileName,
      mimeType: 'text/plain',
      buffer: Buffer.from(`${storybook.name} Storybook E2E`),
    })

    await expect(page.getByText(fileName)).toBeVisible()
    await page.getByRole('button', { name: /upload/i }).click()
    await expect(root).toHaveAttribute('data-state', 'successful')
  })
}
