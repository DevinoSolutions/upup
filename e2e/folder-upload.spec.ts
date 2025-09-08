import { expect, test } from '@playwright/test'

// This test targets the Storybook story for UpupUploader
// It simulates selecting a folder by providing files with relative paths
// to the hidden input[type=file] (webkitdirectory behavior in Chromium)

test('folder upload selects and displays structured files', async ({
    page,
}) => {
    // Navigate to the Storybook iframe story (baseURL provided by config)
    // Storybook generates ids from titles by lowercasing and stripping punctuation.
    // Title: 'UpUpUploader' => id: 'upupuploader'
    await page.goto('/iframe.html?id=upupuploader--uploader-with-button')

    // Wait for the UI to be ready using a visible anchor
    await expect(page.getByRole('button', { name: /browse/i })).toBeVisible({
        timeout: 20000,
    })

    // The story renders the component centered; find the hidden file input
    const fileInput = page.getByTestId('upup-file-input')
    await expect(fileInput).toHaveCount(1, { timeout: 15000 })

    // Create a virtual folder with nested files
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
                // Tiny 1x1 transparent PNG
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

    // After selection, file list should render items
    // Use the file names as text content anchors
    await expect(page.getByText('readme.txt')).toBeVisible()
    await expect(page.getByText('photo.png')).toBeVisible()
    await expect(page.getByText('photo2.png')).toBeVisible()

    // Validate count text on the Upload button
    const uploadBtn = page.getByRole('button', { name: /Upload 3 files/i })
    await expect(uploadBtn).toBeVisible()

    // Optional: ensure ordering by relative path (images/ before images/sub/ before docs/)
    const allNames = await page
        .locator('[data-testid="upup-file-item"], .upup-preview-scroll *')
        .filter({ hasText: /readme\.txt|photo2?\.png/i })
        .allInnerTexts()
    expect(allNames.join(' ')).toMatch(
        /photo\.png[\s\S]*photo2\.png[\s\S]*readme\.txt/i,
    )

    // Trigger upload and verify backend was called for each file
    await uploadBtn.click()
    const expectedCount = 3
    let seen = 0
    await Promise.all(
        Array.from({ length: expectedCount }).map(() =>
            page.waitForResponse(r => {
                const ok = r.url().includes('/api/upload') && r.status() === 200
                if (ok) seen++
                return ok
            }),
        ),
    )
    expect(seen).toBe(expectedCount)
})
