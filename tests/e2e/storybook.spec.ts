import { expect, test, type Page } from '@playwright/test'

const storybooks = [
  { name: 'React', baseUrl: 'http://127.0.0.1:6007' },
  { name: 'Vue', baseUrl: 'http://127.0.0.1:6008' },
] as const

function storyUrl(baseUrl: string, storyId: string) {
  return `${baseUrl}/iframe.html?id=${storyId}&viewMode=story`
}

async function openStory(page: Page, baseUrl: string, storyId: string) {
  await page.goto(storyUrl(baseUrl, storyId), { waitUntil: 'domcontentloaded' })
  await expect(page.locator('[data-testid="upup-root"]')).toBeVisible()
}

async function expectStoryReady(page: Page) {
  await expect(page.locator('[data-testid="upup-root"]')).toBeVisible()
}

async function selectTextFile(page: Page, name: string) {
  await page.locator('[data-testid="upup-file-input"]').first().setInputFiles({
    name,
    mimeType: 'text/plain',
    buffer: Buffer.alloc(2048, 'x'),
  })
  await expect(page.getByText(name)).toBeVisible()
}

async function uploadTextFile(page: Page, name: string) {
  await selectTextFile(page, name)
  await page.getByRole('button', { name: /upload/i }).click()
}

async function dispatchFileEvent(page: Page, type: 'drop' | 'paste', fileName: string) {
  await page.locator('[data-testid="upup-dropzone"]').evaluate(
    (dropzone, event) => {
      const transfer = new DataTransfer()
      transfer.items.add(
        new File([new Uint8Array(2048).fill(120)], event.fileName, {
          type: 'text/plain',
        }),
      )

      if (event.type === 'drop') {
        dropzone.dispatchEvent(
          new DragEvent('dragover', {
            bubbles: true,
            cancelable: true,
            dataTransfer: transfer,
          }),
        )
        dropzone.dispatchEvent(
          new DragEvent('drop', {
            bubbles: true,
            cancelable: true,
            dataTransfer: transfer,
          }),
        )
        return
      }

      dropzone.dispatchEvent(
        new ClipboardEvent('paste', {
          bubbles: true,
          cancelable: true,
          clipboardData: transfer,
        }),
      )
    },
    { type, fileName },
  )
}

for (const storybook of storybooks) {
  test.describe(`${storybook.name} Storybook uploader flows`, () => {
    test('runs the local multiple-file and removal story', async ({ page }) => {
      await openStory(page, storybook.baseUrl, 'uploader-behavior--multiple-files')

      await expect(page.getByText('storybook-beta.txt')).toBeVisible()
      await expect(page.getByText('storybook-gamma.txt')).toBeVisible()
      await expect(page.getByText('storybook-alpha.txt')).toHaveCount(0)
    })

    test('runs URL fetch success and failure stories', async ({ page }) => {
      await openStory(page, storybook.baseUrl, 'uploader-sources--url')
      await page.locator('[data-testid="upup-source-url"]').click()
      await page.getByPlaceholder(/enter file url/i).fill(`${storybook.baseUrl}/storybook/upup/object/sample.txt`)
      await page.getByRole('button', { name: /fetch/i }).click()
      await expect(page.getByText('sample.txt')).toBeVisible()

      await openStory(page, storybook.baseUrl, 'uploader-sources--url')
      await page.locator('[data-testid="upup-source-url"]').click()
      await page.getByPlaceholder(/enter file url/i).fill(`${storybook.baseUrl}/storybook/upup/object/missing.txt`)
      await page.getByRole('button', { name: /fetch/i }).click()
      await expectStoryReady(page)
      await expect(page.getByPlaceholder(/enter file url/i)).toBeVisible()
      await expect(page.locator('[data-testid="upup-file-item"]').filter({ hasText: 'sample.txt' })).toHaveCount(0)
    })

    test('runs drag/drop and paste stories', async ({ page }) => {
      const droppedFile = `${storybook.name.toLowerCase()}-dropped.txt`
      await openStory(page, storybook.baseUrl, 'uploader-behavior--drag-drop')
      await dispatchFileEvent(page, 'drop', droppedFile)
      await expect(page.getByText(droppedFile)).toBeVisible()

      await openStory(page, storybook.baseUrl, 'uploader-behavior--paste-upload')
      await dispatchFileEvent(page, 'paste', 'storybook-pasted.txt')
      await expect(page.locator('[data-testid="upup-file-item"]').filter({ hasText: 'storybook-pasted.txt' }).first()).toBeVisible()
    })

    test('runs upload success and failure stories', async ({ page }) => {
      await openStory(page, storybook.baseUrl, 'uploader-uploadflow--success')
      await expect(page.locator('[data-testid="upup-root"]')).toHaveAttribute('data-state', 'successful')
      await expect(page.getByRole('button', { name: /done/i })).toBeVisible()

      await openStory(page, storybook.baseUrl, 'uploader-uploadflow--failure')
      await expect(page.locator('[data-testid="upup-root"]')).toHaveAttribute('data-state', 'failed')
      await expect(page.locator('[data-testid="upup-retry-btn"]')).toBeVisible()
    })

    test('renders server-mode, theme, and RTL stories', async ({ page }) => {
      await openStory(page, storybook.baseUrl, 'uploader-servermode--success')
      await uploadTextFile(page, `${storybook.name.toLowerCase()}-server.txt`)
      await expect(page.locator('[data-testid="upup-root"]')).toHaveAttribute('data-state', 'successful')

      await openStory(page, storybook.baseUrl, 'uploader-theme--dark')
      await expectStoryReady(page)

      await openStory(page, storybook.baseUrl, 'uploader-i18n--rtl')
      await expect(page.locator('[data-testid="upup-root"]')).toHaveAttribute('dir', 'rtl')
    })
  })
}
