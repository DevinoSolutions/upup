import path from 'path'
import { expect, test } from '../fixtures/baseTest'

const IMAGE_EDITOR_STORY_URL =
    'http://localhost:53050/iframe.html?id=upupuploader--uploader-with-image-editor&viewMode=story'

const TEST_IMAGE = path.resolve(__dirname, '../../test-files/image1.jpg')

test.describe('Image Editor', () => {
    test.beforeEach(async ({ uploaderPage, page }) => {
        // Navigate to the image-editor story instead of the default one
        await page.goto(IMAGE_EDITOR_STORY_URL)
        await page.waitForLoadState('domcontentloaded')
        await uploaderPage.uploaderRegion.waitFor({ state: 'visible' })

        // Upload an image via the file input
        await page.locator('input[type="file"]').setInputFiles(TEST_IMAGE)

        // Wait for the file to appear in the list
        await expect(page.getByTestId('upup-file-item')).toHaveCount(1, {
            timeout: 5000,
        })
    })

    test('should show edit button on image file preview', async ({ page }) => {
        await expect(
            page.getByRole('button', { name: 'Edit image' }),
        ).toBeVisible({ timeout: 5000 })
    })

    test('should open inline image editor when edit button is clicked', async ({
        page,
    }) => {
        // Click the edit button
        await page.getByRole('button', { name: 'Edit image' }).click()

        // The inline editor should appear with aria-label "Editing image: <filename>"
        await expect(
            page.getByRole('region', { name: /Editing image/ }),
        ).toBeVisible({ timeout: 10000 })

        // The editor header should show "Cancel" button
        await expect(
            page.getByRole('button', { name: 'Cancel' }),
        ).toBeVisible()
    })

    test('should close image editor when cancel is clicked', async ({
        page,
    }) => {
        // Open the editor
        await page.getByRole('button', { name: 'Edit image' }).click()
        await expect(
            page.getByRole('region', { name: /Editing image/ }),
        ).toBeVisible({ timeout: 10000 })

        // Click cancel
        await page.getByRole('button', { name: 'Cancel' }).click()

        // Editor should be closed — the editing region should disappear
        await expect(
            page.getByRole('region', { name: /Editing image/ }),
        ).toBeHidden({ timeout: 5000 })

        // The file should still be in the list
        await expect(page.getByTestId('upup-file-item')).toHaveCount(1)
    })
})
