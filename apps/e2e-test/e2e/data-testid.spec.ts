import { test, expect } from '@playwright/test'

test.describe('data-testid selectors', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('upup-root exists', async ({ page }) => {
    await expect(page.locator('[data-testid="upup-root"]')).toHaveCount(1)
  })

  test('upup-container exists', async ({ page }) => {
    await expect(page.locator('[data-testid="upup-container"]')).toHaveCount(1)
  })

  test('upup-dropzone exists', async ({ page }) => {
    await expect(page.locator('[data-testid="upup-dropzone"]')).toHaveCount(1)
  })

  test('upup-browse-files exists', async ({ page }) => {
    await expect(page.locator('[data-testid="upup-browse-files"]')).toHaveCount(1)
  })

  test('upup-branding exists', async ({ page }) => {
    await expect(page.locator('[data-testid="upup-branding"]')).toHaveCount(1)
  })

  test('source buttons have data-testid', async ({ page }) => {
    await expect(page.locator('[data-testid="upup-source-local"]')).toHaveCount(1)
    await expect(page.locator('[data-testid="upup-source-googleDrive"]')).toHaveCount(1)
    await expect(page.locator('[data-testid="upup-source-oneDrive"]')).toHaveCount(1)
    await expect(page.locator('[data-testid="upup-source-dropbox"]')).toHaveCount(1)
    await expect(page.locator('[data-testid="upup-source-url"]')).toHaveCount(1)
    await expect(page.locator('[data-testid="upup-source-camera"]')).toHaveCount(1)
  })
})

test.describe('Headless hook demo', () => {
  test('renders custom UI with status', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Headless Hook' }).click()
    await expect(page.getByText('Headless Hook Demo')).toBeVisible()
    await expect(page.getByText('Status: IDLE')).toBeVisible()
    await expect(page.getByText('Files: 0')).toBeVisible()
    await expect(page.getByText('Progress: 0%')).toBeVisible()
  })

  test('can switch back to full UI', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Headless Hook' }).click()
    await expect(page.getByText('Headless Hook Demo')).toBeVisible()
    await page.getByRole('button', { name: 'Dark Mode' }).click()
    await expect(page.getByRole('button', { name: 'My Device' })).toBeVisible()
  })
})
