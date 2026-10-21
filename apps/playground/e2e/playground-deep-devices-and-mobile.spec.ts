import { expect, test } from '@playwright/test'

import {
    registerBrowserIssueGuards,
    allowExpectedMockFailure,
    textFile,
    uniqueRun,
    openPlayground,
    category,
    openCategory,
    setNumber,
    attachScreenshot,
    selectFiles,
    mockDisplayMedia,
} from './playground-deep-helpers'

registerBrowserIssueGuards()

test('camera and microphone capture flows create real queued files with fake browser devices', async ({
    page,
}, testInfo) => {
    await openPlayground(page)

    await page.getByTestId('upup-source-camera').click()
    await expect(page.getByTestId('upup-camera-uploader')).toBeVisible()
    await page.getByRole('button', { name: /Capture/i }).click()
    await expect(page.getByRole('button', { name: /Add image/i })).toBeVisible()
    await page.getByRole('button', { name: /Add image/i }).click()
    await expect(page.getByTestId('upup-file-item')).toHaveCount(1)
    await attachScreenshot(page, testInfo, 'camera-capture-added-file')

    await page.getByTestId('upup-file-remove').click()
    await expect(page.getByTestId('upup-file-item')).toHaveCount(0)

    await page.getByTestId('upup-source-microphone').click()
    await page.getByRole('button', { name: 'Start Recording' }).click()
    await expect(
        page.getByRole('button', { name: 'Stop Recording' }),
    ).toBeVisible()
    // sleep-allow(record real audio for a nonzero duration so stopping yields a non-empty media file)
    await page.waitForTimeout(500)
    await page.getByRole('button', { name: 'Stop Recording' }).click()
    await expect(
        page.getByRole('button', { name: 'Add Recording' }),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Add Recording' }).click()
    await expect(page.getByTestId('upup-file-item')).toHaveCount(1)
    await expect(page.getByTestId('upup-file-list')).toContainText(
        /recording-\d+\.(webm|ogg)/,
    )
    await attachScreenshot(page, testInfo, 'microphone-recording-added-file')
})

test('screen capture source records a mocked display stream and queues the recording', async ({
    page,
}, testInfo) => {
    await mockDisplayMedia(page)
    await openPlayground(page)

    await page.getByTestId('upup-source-screen').click()
    await page.getByRole('button', { name: 'Share Screen' }).click()
    await expect(
        page.getByRole('button', { name: 'Stop Recording' }),
    ).toBeVisible()
    // sleep-allow(record the mocked display stream for a nonzero duration so stopping yields a non-empty media file)
    await page.waitForTimeout(500)
    await page.getByRole('button', { name: 'Stop Recording' }).click()
    await expect(
        page.getByRole('button', { name: 'Add Recording' }),
    ).toBeVisible()
    await attachScreenshot(page, testInfo, 'screen-capture-recorded')

    await page.getByRole('button', { name: 'Add Recording' }).click()
    await expect(page.getByTestId('upup-file-item')).toHaveCount(1)
    await expect(page.getByTestId('upup-file-list')).toContainText(
        /screen-recording-\d+\.webm/,
    )
    await attachScreenshot(page, testInfo, 'screen-capture-added-file')
})

test.describe('mobile playground acceptance', () => {
    test.use({ viewport: { width: 390, height: 844 } })

    test('selects and uploads a local file without horizontal overflow or clipped controls', async ({
        page,
    }, testInfo) => {
        await openPlayground(page, `?mockRun=${uniqueRun('mobile')}`)
        await page.locator('.upup-ie-main').scrollIntoViewIfNeeded()
        await selectFiles(page, [textFile('mobile-upload.txt')])

        await page.getByTestId('upup-upload-btn').scrollIntoViewIfNeeded()
        await page.getByTestId('upup-upload-btn').click()
        await expect(page.getByTestId('upup-root')).toHaveAttribute(
            'data-state',
            'successful',
        )

        const horizontalOverflow = await page.evaluate(
            () =>
                Math.max(
                    document.documentElement.scrollWidth,
                    document.body.scrollWidth,
                ) - window.innerWidth,
        )
        expect(horizontalOverflow).toBeLessThanOrEqual(2)

        await attachScreenshot(page, testInfo, 'mobile-upload-success', true)
    })
})

const mobileViewports = [
    { name: 'small-phone', width: 320, height: 568 },
    { name: 'landscape-phone', width: 844, height: 390 },
    { name: 'tablet', width: 768, height: 1024 },
]

for (const viewport of mobileViewports) {
    test.describe(`mobile breadth ${viewport.name}`, () => {
        test.use({
            viewport: { width: viewport.width, height: viewport.height },
        })

        test('keeps source panels, retry state, and RTL layout usable without horizontal overflow', async ({
            page,
        }, testInfo) => {
            await openPlayground(
                page,
                `?mockFailure=once&mockRun=${uniqueRun(`mobile-${viewport.name}`)}`,
            )
            allowExpectedMockFailure.add(page)
            await setNumber(page, 'Max retries', '0')

            await openCategory(page, 'Language')
            await category(page, 'Language')
                .getByRole('combobox', { name: /^Locale\b/ })
                .selectOption('ar-SA')
            await expect(page.getByTestId('upup-root')).toHaveAttribute(
                'dir',
                'rtl',
            )

            await page.getByTestId('upup-source-url').scrollIntoViewIfNeeded()
            await page.getByTestId('upup-source-url').click()
            await expect(page.getByTestId('upup-url-uploader')).toBeVisible()
            await page.getByRole('button', { name: /إلغاء|Cancel/ }).click()

            await selectFiles(page, [textFile(`mobile-${viewport.name}.txt`)])
            await page.getByTestId('upup-upload-btn').scrollIntoViewIfNeeded()
            await page.getByTestId('upup-upload-btn').click()
            await expect(page.getByTestId('upup-root')).toHaveAttribute(
                'data-state',
                'failed',
            )
            await expect(page.getByTestId('upup-retry-btn')).toBeVisible()

            const horizontalOverflow = await page.evaluate(
                () =>
                    Math.max(
                        document.documentElement.scrollWidth,
                        document.body.scrollWidth,
                    ) - window.innerWidth,
            )
            expect(horizontalOverflow).toBeLessThanOrEqual(2)
            await attachScreenshot(
                page,
                testInfo,
                `mobile-${viewport.name}-rtl-retry`,
                true,
            )
        })
    })
}
