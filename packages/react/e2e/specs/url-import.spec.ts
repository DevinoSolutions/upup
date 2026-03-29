import { expect, test } from '../fixtures/baseTest'

test.describe('URL/Link Adapter', () => {
    const TEST_URL = 'https://example.com/test-image.jpg'

    test.beforeEach(async ({ uploaderPage, page }) => {
        // Mock the URL fetch to return a fake image
        await page.route(TEST_URL, route => {
            route.fulfill({
                status: 200,
                contentType: 'image/jpeg',
                body: Buffer.from(
                    'R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=',
                    'base64',
                ),
            })
        })

        await uploaderPage.goTo()
        // Click on Link adapter
        await page.getByRole('button', { name: 'Link' }).click()
    })

    test('should show URL input and fetch button', async ({ page }) => {
        await expect(
            page.getByPlaceholder('Enter file url'),
        ).toBeVisible({ timeout: 10000 })
        await expect(
            page.getByRole('button', { name: 'Fetch' }),
        ).toBeVisible()
    })

    test('should disable fetch button when URL is empty', async ({
        page,
    }) => {
        await expect(
            page.getByRole('button', { name: 'Fetch' }),
        ).toBeDisabled()
    })

    test('should fetch a file from URL and add it', async ({
        uploaderPage,
        page,
    }) => {
        // Type a URL
        await page
            .getByPlaceholder('Enter file url')
            .fill(TEST_URL)

        // Fetch button should be enabled
        await expect(
            page.getByRole('button', { name: 'Fetch' }),
        ).toBeEnabled()

        // Click Fetch
        await page.getByRole('button', { name: 'Fetch' }).click()

        // File should appear in upload area
        await expect(
            uploaderPage.page.getByTestId('upup-file-item'),
        ).toHaveCount(1, { timeout: 10000 })
    })
})
