import { expect, test } from '../fixtures/baseTest'

test.describe('Audio Adapter', () => {
    test.beforeEach(async ({ uploaderPage, page }) => {
        await uploaderPage.goTo()
        // Click on Audio adapter
        await page.getByRole('button', { name: 'Audio' }).click()
    })

    test('should show start recording button', async ({ page }) => {
        await expect(
            page.getByRole('button', { name: 'Start Recording' }),
        ).toBeVisible({ timeout: 10000 })
    })

    test('should record audio and add it', async ({ uploaderPage, page }) => {
        // Click Start Recording
        await page
            .getByRole('button', { name: 'Start Recording' })
            .click()

        // Stop Recording button should appear
        await expect(
            page.getByRole('button', { name: 'Stop Recording' }),
        ).toBeVisible({ timeout: 5000 })

        // Wait for some recording data
        await page.waitForTimeout(2000)

        // Stop recording
        await page.getByRole('button', { name: 'Stop Recording' }).click()

        // "Add Audio" button should appear
        await expect(
            page.getByRole('button', { name: 'Add Audio' }),
        ).toBeVisible({ timeout: 5000 })

        // Add the audio
        await page.getByRole('button', { name: 'Add Audio' }).click()

        // File should now appear in the upload area
        await expect(
            uploaderPage.page.getByTestId('upup-file-item'),
        ).toHaveCount(1, { timeout: 5000 })
    })

    test('should allow deleting a recording before adding', async ({
        page,
    }) => {
        // Record something
        await page
            .getByRole('button', { name: 'Start Recording' })
            .click()
        await page.waitForTimeout(1000)
        await page.getByRole('button', { name: 'Stop Recording' }).click()

        // Wait for playback state
        await expect(
            page.getByRole('button', { name: 'Add Audio' }),
        ).toBeVisible({ timeout: 5000 })

        // Delete recording
        await page
            .getByRole('button', { name: 'Delete Recording' })
            .click()

        // Should go back to idle state with Start Recording button
        await expect(
            page.getByRole('button', { name: 'Start Recording' }),
        ).toBeVisible({ timeout: 5000 })
    })
})
