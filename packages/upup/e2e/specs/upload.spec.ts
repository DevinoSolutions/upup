import { expect, test } from '../fixtures/baseTest'
import { UploaderLocators as locators } from '../locators/UploaderLocators'

test.describe('Upup Uploader Component - Full Validation', () => {
    test.beforeEach(async ({ uploaderPage }) => {
        await uploaderPage.goTo()
    })

    test('should display initial upload instructions', async ({
        uploaderPage,
    }) => {
        await expect(uploaderPage.uploaderRegion).toContainText(
            locators.messages.dropInstructions,
        )
    })

    test('should handle selection of 10 files', async ({ uploaderPage }) => {
        const files = Array.from(
            { length: 10 },
            (_, i) => `test-files/image${i + 1}.jpg`,
        )

        await uploaderPage.uploadFiles(files)

        await expect(uploaderPage.uploaderRegion).toContainText(
            '10 files selected',
        )
    })

    test('should allow removing all files to reset state', async ({
        uploaderPage,
    }) => {
        await uploaderPage.uploadFiles([
            'test-files/image1.jpg',
            'test-files/image2.jpg',
        ])
        await uploaderPage.removeAllFiles()

        await expect(uploaderPage.uploaderRegion).toContainText(
            locators.messages.dropInstructions,
        )
    })

    test('upload button should hide after clicking', async ({
        uploaderPage,
        page,
        mockUploadApi,
    }) => {
        await uploaderPage.uploadFiles(['test-files/image1.jpg'])
        const uploadBtn = page.getByRole('button', { name: 'Upload 1 file' })

        await uploadBtn.click()

        await expect(uploadBtn).not.toBeVisible({ timeout: 5000 })
    })
})
