import { expect, test } from '../fixtures/baseTest'

test.describe('Camera Adapter', () => {
    test.beforeEach(async ({ uploaderPage, page }) => {
        await uploaderPage.goTo()
        // Click on Camera adapter
        await page.getByRole('button', { name: 'Camera' }).click()
    })

    test('should open camera view with photo mode by default', async ({
        page,
    }) => {
        // Photo mode should be active by default
        await expect(page.getByRole('button', { name: 'Photo' })).toBeVisible()
        await expect(page.getByRole('button', { name: 'Video' })).toBeVisible()
        // Capture button should be visible
        await expect(
            page.getByRole('button', { name: 'Capture' }),
        ).toBeVisible({ timeout: 10000 })
    })

    test('should capture a photo and add it', async ({
        uploaderPage,
        page,
    }) => {
        // Wait for webcam to initialize and capture button to appear
        await expect(
            page.getByRole('button', { name: 'Capture' }),
        ).toBeVisible({ timeout: 10000 })

        // Click capture
        await page.getByRole('button', { name: 'Capture' }).click()

        // After capture, "Add Image" button should appear
        await expect(
            page.getByRole('button', { name: 'Add Image' }),
        ).toBeVisible({ timeout: 5000 })

        // Click "Add Image" to add the captured photo to the file list
        await page.getByRole('button', { name: 'Add Image' }).click()

        // File should now appear in the upload area
        await expect(
            uploaderPage.page.getByTestId('upup-file-item'),
        ).toHaveCount(1, { timeout: 5000 })
    })

    test('should switch to video mode and record a video', async ({
        uploaderPage,
        page,
    }) => {
        // Switch to Video mode
        await page.getByRole('button', { name: 'Video' }).click()

        // Record button should appear
        await expect(
            page.getByRole('button', { name: 'Record' }),
        ).toBeVisible({ timeout: 10000 })

        // Start recording
        await page.getByRole('button', { name: 'Record' }).click()

        // Stop button should appear during recording
        await expect(
            page.getByRole('button', { name: 'Stop' }),
        ).toBeVisible({ timeout: 5000 })

        // Wait a moment for some recording data
        await page.waitForTimeout(2000)

        // Stop recording
        await page.getByRole('button', { name: 'Stop' }).click()

        // "Add Video" button should appear
        await expect(
            page.getByRole('button', { name: 'Add Video' }),
        ).toBeVisible({ timeout: 5000 })

        // Add the video
        await page.getByRole('button', { name: 'Add Video' }).click()

        // File should now appear in the upload area
        await expect(
            uploaderPage.page.getByTestId('upup-file-item'),
        ).toHaveCount(1, { timeout: 5000 })
    })

    test('should show mirror button', async ({ page }) => {
        await expect(
            page.getByRole('button', { name: 'Capture' }),
        ).toBeVisible({ timeout: 10000 })

        await expect(
            page.getByRole('button', { name: 'Mirror' }),
        ).toBeVisible()
    })
})
