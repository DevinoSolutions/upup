import { expect, test } from '@playwright/test'
import { setupMockUploadApi } from './fixtures/mockUploadApi'

test('folder upload selects and displays structured files', async ({ page }) => {
    // Setup mock before navigation
    const mockUploadApi = await setupMockUploadApi(page);

    // Navigate to Storybook
    await page.goto('/iframe.html?id=upupuploader--uploader-with-button')

    // Wait for UI
    await expect(page.getByRole('button', { name: /browse/i })).toBeVisible({
        timeout: 20000,
    })

    // Find file input
    const fileInput = page.getByTestId('upup-file-input')
    await expect(fileInput).toHaveCount(1, { timeout: 15000 })

    // Create virtual folder files
    const files = [
        {
            name: 'docs/readme.txt',
            mimeType: 'text/plain',
            buffer: Buffer.from('hello world'),
        },
        {
            name: 'images/photo.png',
            mimeType: 'image/png',
            buffer: Buffer.from(
                'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAn0B4y1bq3kAAAAASUVORK5CYII=',
                'base64',
            ),
        },
        {
            name: 'images/sub/photo2.png',
            mimeType: 'image/png',
            buffer: Buffer.from(
                'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAn0B4y1bq3kAAAAASUVORK5CYII=',
                'base64',
            ),
        },
    ]

    await fileInput.setInputFiles(
        files.map(f => ({
            name: f.name,
            mimeType: f.mimeType,
            buffer: f.buffer,
        })),
    )

    // Verify files displayed
    await expect(page.getByText('readme.txt')).toBeVisible()
    await expect(page.getByText('photo.png')).toBeVisible()
    await expect(page.getByText('photo2.png')).toBeVisible()

    // Check upload button
    const uploadBtn = page.getByRole('button', { name: /Upload 3 files/i })
    await expect(uploadBtn).toBeVisible()

    // Verify ordering
    const allNames = await page
        .locator('[data-testid="upup-file-item"], .upup-preview-scroll *')
        .filter({ hasText: /readme\.txt|photo2?\.png/i })
        .allInnerTexts()
    expect(allNames.join(' ')).toMatch(
        /photo\.png[\s\S]*photo2\.png[\s\S]*readme\.txt/i,
    )

    // Click upload and wait for all responses
    const uploadPromise = mockUploadApi.waitForUploads(files.length);
    await uploadBtn.click();
    await uploadPromise;

    // Verify all files were uploaded
    expect(mockUploadApi.getUploadCount()).toBe(files.length);
})