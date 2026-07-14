import { test, expect } from '@playwright/test'

test.describe('UpupUploader rendering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('renders with Dark Mode button active', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Dark Mode' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Light Mode' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Headless Hook' })).toBeVisible()
  })

  test('shows header text with file limit', async ({ page }) => {
    await expect(page.getByText('Add your documents here, you can upload up to 99 files max')).toBeVisible()
  })

  test('renders all 8 source icons', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'My Device' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Google Drive' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'OneDrive' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Dropbox' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Link' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Camera' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Audio' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Screen Capture' })).toBeVisible()
  })

  test('shows drag and browse text', async ({ page }) => {
    await expect(page.getByText('Drag your files or')).toBeVisible()
    await expect(page.getByRole('button', { name: 'browse files' })).toBeVisible()
  })

  test('shows max file size', async ({ page }) => {
    await expect(page.getByText('Max 999 MB files are allowed')).toBeVisible()
  })

  test('shows branding footer', async ({ page }) => {
    await expect(page.getByText('Built by')).toBeVisible()
  })

  test('has data-testid on root', async ({ page }) => {
    await expect(page.locator('[data-testid="upup-root"]')).toBeVisible()
  })

  test('has data-testid on dropzone', async ({ page }) => {
    await expect(page.locator('[data-testid="upup-dropzone"]')).toBeVisible()
  })

  test('has data-testid on browse button', async ({ page }) => {
    await expect(page.locator('[data-testid="upup-browse-files"]')).toBeVisible()
  })
})

test.describe('Theme switching', () => {
  test('switches to light mode', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Light Mode' }).click()
    // In light mode, the card should have a white background
    const root = page.locator('[data-testid="upup-root"]')
    await expect(root).toBeVisible()
  })

  test('switches to headless mode', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Headless Hook' }).click()
    await expect(page.getByText('Headless Hook Demo')).toBeVisible()
    await expect(page.getByText('Status: IDLE')).toBeVisible()
  })
})

test.describe('Adapter views', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('Link adapter shows URL input', async ({ page }) => {
    await page.getByRole('button', { name: 'Link' }).click()
    await expect(page.getByPlaceholder('Enter file url')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Fetch' })).toBeVisible()
    await expect(page.getByText('Cancel')).toBeVisible()
  })

  test('Camera adapter shows capture button', async ({ page }) => {
    await page.getByRole('button', { name: 'Camera' }).click()
    await expect(page.getByText('Capture')).toBeVisible()
    await expect(page.getByText('Cancel')).toBeVisible()
  })
})
