import { expect, test } from '../fixtures/baseTest'

/**
 * Screen Capture tests require mocking getDisplayMedia since the native
 * screen picker dialog cannot be automated even with fake media stream flags.
 * We inject a mock that returns a fake MediaStream with a video track.
 */
test.describe('Screen Capture Adapter', () => {
    test.beforeEach(async ({ uploaderPage, page }) => {
        // Mock getDisplayMedia to return a fake stream
        await page.addInitScript(() => {
            const createFakeStream = () => {
                const canvas = document.createElement('canvas')
                canvas.width = 640
                canvas.height = 480
                const ctx = canvas.getContext('2d')!
                // Draw something so the stream has content
                ctx.fillStyle = '#3498db'
                ctx.fillRect(0, 0, 640, 480)
                ctx.fillStyle = '#ffffff'
                ctx.font = '30px Arial'
                ctx.fillText('Screen Capture Mock', 100, 250)

                const stream = canvas.captureStream(30)
                // Add a fake audio track via oscillator
                try {
                    const audioCtx = new AudioContext()
                    const oscillator = audioCtx.createOscillator()
                    const dest = audioCtx.createMediaStreamDestination()
                    oscillator.connect(dest)
                    oscillator.start()
                    stream.addTrack(dest.stream.getAudioTracks()[0])
                } catch {
                    // Audio track is optional
                }
                return stream
            }

            navigator.mediaDevices.getDisplayMedia = async () =>
                createFakeStream()
        })

        await uploaderPage.goTo()
        // Click on Screen Capture adapter
        await page.getByRole('button', { name: 'Screen Capture' }).click()
    })

    test('should show start screen capture button', async ({ page }) => {
        await expect(
            page.getByRole('button', { name: 'Start Screen Capture' }),
        ).toBeVisible({ timeout: 10000 })
    })

    test('should capture screen and add it', async ({
        uploaderPage,
        page,
    }) => {
        // Start screen capture
        await page
            .getByRole('button', { name: 'Start Screen Capture' })
            .click()

        // Wait for Stop Capture button
        await expect(
            page.getByRole('button', { name: 'Stop Capture' }),
        ).toBeVisible({ timeout: 5000 })

        // Let it record for a bit
        await page.waitForTimeout(2000)

        // Stop capture
        await page.getByRole('button', { name: 'Stop Capture' }).click()

        // Wait for Add Screen Capture button
        await expect(
            page.getByRole('button', { name: 'Add Screen Capture' }),
        ).toBeVisible({ timeout: 5000 })

        // Add the capture
        await page
            .getByRole('button', { name: 'Add Screen Capture' })
            .click()

        // File should appear in upload area
        await expect(
            uploaderPage.page.getByTestId('upup-file-item'),
        ).toHaveCount(1, { timeout: 5000 })
    })

    test('should allow deleting a screen capture before adding', async ({
        page,
    }) => {
        // Start and stop capture
        await page
            .getByRole('button', { name: 'Start Screen Capture' })
            .click()
        await page.waitForTimeout(1000)
        await page.getByRole('button', { name: 'Stop Capture' }).click()

        // Wait for preview state
        await expect(
            page.getByRole('button', { name: 'Add Screen Capture' }),
        ).toBeVisible({ timeout: 5000 })

        // Delete recording
        await page
            .getByRole('button', { name: 'Delete Recording' })
            .click()

        // Should return to idle state
        await expect(
            page.getByRole('button', { name: 'Start Screen Capture' }),
        ).toBeVisible({ timeout: 5000 })
    })
})
