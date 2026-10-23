import { expect, test } from '@playwright/test'

import {
    registerBrowserIssueGuards,
    TEXT_SENTINEL,
    textFile,
    imageFile,
    openPlayground,
    openCategory,
    checkSidebarCheckbox,
    fillNestedTextField,
    ensureSourceTile,
    attachScreenshot,
    selectFiles,
} from './playground-deep-helpers'

registerBrowserIssueGuards()

test('selects real text and image files, renders file cards, and opens a text preview', async ({
    page,
}, testInfo) => {
    await openPlayground(page)
    await selectFiles(page, [imageFile(), textFile()])

    const items = page.getByTestId('upup-file-item')
    await expect(items).toHaveCount(2)
    await expect(items.filter({ hasText: 'preview-image.png' })).toBeVisible()
    await expect(items.filter({ hasText: 'playground-note.txt' })).toBeVisible()

    const textItem = items.filter({ hasText: 'playground-note.txt' })
    const fileNameIsReadableOnLightSurface = await textItem
        .getByText('playground-note.txt')
        .evaluate(el => {
            const [red = 255, green = 255, blue = 255] =
                getComputedStyle(el)
                    .color.match(/\d+(\.\d+)?/g)
                    ?.map(Number) ?? []
            return red < 160 && green < 160 && blue < 160
        })
    expect(fileNameIsReadableOnLightSurface).toBe(true)

    const imageThumb = items
        .filter({ hasText: 'preview-image.png' })
        .locator('[data-testid="upup-file-preview"] > div')
        .first()

    await expect
        .poll(async () =>
            imageThumb.evaluate(el => getComputedStyle(el).backgroundImage),
        )
        .toContain('blob:')

    await attachScreenshot(page, testInfo, 'selected-text-and-image')

    const previewButton = textItem.getByRole('button', {
        name: /click to preview/i,
    })
    await expect(previewButton).toBeVisible()
    await previewButton.click()
    await expect(
        page.locator('[data-upup-slot="file-preview-portal"]'),
    ).toContainText(TEXT_SENTINEL)

    await attachScreenshot(page, testInfo, 'text-preview-portal')
    await page.keyboard.press('Escape')
    await expect(
        page.locator('[data-upup-slot="file-preview-portal"]'),
    ).toHaveCount(0)
})

test('opens every default source panel without runtime errors', async ({
    page,
}, testInfo) => {
    await openPlayground(page)

    const chooserPromise = page.waitForEvent('filechooser')
    await page.getByTestId('upup-source-local').click()
    const chooser = await chooserPromise
    expect(chooser.isMultiple()).toBe(true)
    await chooser.setFiles([])

    const sourcePanels = [
        {
            id: 'url',
            assert: () =>
                expect(page.getByTestId('upup-url-uploader')).toBeVisible(),
        },
        {
            id: 'camera',
            assert: () =>
                expect(page.getByTestId('upup-camera-uploader')).toBeVisible(),
        },
        {
            id: 'microphone',
            assert: () =>
                expect(
                    page.getByRole('button', { name: 'Start Recording' }),
                ).toBeVisible(),
        },
        {
            id: 'screen',
            assert: () =>
                expect(
                    page.getByRole('button', { name: 'Share Screen' }),
                ).toBeVisible(),
        },
    ]

    for (const panel of sourcePanels) {
        await page.getByTestId(`upup-source-${panel.id}`).click()
        await panel.assert()
        await page.getByRole('button', { name: 'Cancel' }).click()
        await expect(page.getByRole('button', { name: 'Cancel' })).toHaveCount(
            0,
        )
    }

    await attachScreenshot(page, testInfo, 'default-source-panels-verified')
})

test('opens every client cloud source panel with v2 cloudDrives config and logs integration clicks', async ({
    page,
}, testInfo) => {
    await page.route('https://accounts.google.com/gsi/client', async route => {
        await route.fulfill({
            status: 200,
            contentType: 'application/javascript',
            body: `
                window.google = {
                    accounts: {
                        oauth2: {
                            initTokenClient: function () {
                                return { requestAccessToken: function () {} };
                            }
                        }
                    }
                };
            `,
        })
    })

    await openPlayground(page)
    await openCategory(page, 'Advanced')
    await fillNestedTextField(
        page,
        'Advanced',
        'Google Drive',
        'Client ID',
        'fake-google-client',
    )
    await fillNestedTextField(
        page,
        'Advanced',
        'Google Drive',
        'API Key',
        'fake-google-key',
    )
    await fillNestedTextField(
        page,
        'Advanced',
        'Google Drive',
        'App ID',
        'fake-google-app',
    )
    await fillNestedTextField(
        page,
        'Advanced',
        'OneDrive',
        'Client ID',
        'fake-one-drive-client',
    )
    await fillNestedTextField(
        page,
        'Advanced',
        'Dropbox',
        'Client ID',
        'fake-dropbox-client',
    )
    await fillNestedTextField(
        page,
        'Advanced',
        'Box',
        'Client ID',
        'fake-box-client',
    )

    await openCategory(page, 'Sources')
    for (const label of ['Google Drive', 'OneDrive', 'Dropbox', 'Box']) {
        await ensureSourceTile(page, label)
    }

    await openCategory(page, 'Events')
    await checkSidebarCheckbox(page, 'Events', 'onIntegrationClick')

    const cloudPanels = [
        {
            id: 'googleDrive',
            name: 'Google Drive',
            slot: 'google-drive-uploader',
        },
        { id: 'oneDrive', name: 'OneDrive', slot: 'one-drive-uploader' },
        { id: 'dropbox', name: 'Dropbox', slot: 'dropbox-uploader' },
        { id: 'box', name: 'Box', slot: 'box-uploader' },
    ]

    for (const panel of cloudPanels) {
        await page.getByTestId(`upup-source-${panel.id}`).click()
        await expect(
            page.locator(`[data-upup-slot="${panel.slot}"]`),
        ).toBeVisible({ timeout: 20_000 })
        await expect(
            page.locator(`[data-upup-slot="${panel.slot}"]`),
        ).toContainText(panel.name)
        await page.getByRole('button', { name: 'Cancel' }).click()
        await expect(page.getByRole('button', { name: 'Cancel' })).toHaveCount(
            0,
        )
    }

    await page
        .locator('.upup-ie-tabs')
        .getByRole('button', { name: 'Events' })
        .click()
    const logList = page.locator('.upup-ie-eventlog-list')
    for (const source of ['googleDrive', 'oneDrive', 'dropbox', 'box']) {
        await expect(logList).toContainText(source)
    }
    await attachScreenshot(page, testInfo, 'client-cloud-source-panels')
})

test('cloud adapter auth fallback shows sign-in button with provider name and renders without errors', async ({
    page,
}, testInfo) => {
    await openPlayground(page)
    await openCategory(page, 'Advanced')
    await fillNestedTextField(
        page,
        'Advanced',
        'Google Drive',
        'Client ID',
        'fake-gd',
    )
    await fillNestedTextField(
        page,
        'Advanced',
        'Google Drive',
        'API Key',
        'fake-key',
    )
    await fillNestedTextField(
        page,
        'Advanced',
        'Google Drive',
        'App ID',
        'fake-app',
    )
    await fillNestedTextField(
        page,
        'Advanced',
        'Dropbox',
        'Client ID',
        'fake-dbx',
    )
    await fillNestedTextField(
        page,
        'Advanced',
        'OneDrive',
        'Client ID',
        'fake-od',
    )
    await fillNestedTextField(page, 'Advanced', 'Box', 'Client ID', 'fake-box')

    await openCategory(page, 'Sources')
    for (const label of ['Google Drive', 'OneDrive', 'Dropbox', 'Box']) {
        await ensureSourceTile(page, label)
    }

    const adapters = [
        {
            id: 'googleDrive',
            name: 'Google Drive',
            slot: 'google-drive-uploader',
        },
        { id: 'oneDrive', name: 'OneDrive', slot: 'one-drive-uploader' },
        { id: 'dropbox', name: 'Dropbox', slot: 'dropbox-uploader' },
        { id: 'box', name: 'Box', slot: 'box-uploader' },
    ]

    for (const adapter of adapters) {
        await page.getByTestId(`upup-source-${adapter.id}`).click()
        const panel = page.locator(`[data-upup-slot="${adapter.slot}"]`)
        await expect(panel).toBeVisible({ timeout: 20_000 })

        // Auth fallback should show sign-in button with provider name
        const signInBtn = panel.getByRole('button', {
            name: new RegExp(adapter.name, 'i'),
        })
        await expect(signInBtn).toBeVisible()
        await attachScreenshot(page, testInfo, `auth-fallback-${adapter.id}`)

        // No error overlay or React error boundary should appear
        await expect(page.locator('[data-nextjs-error]')).toHaveCount(0)

        // Navigate back
        await page.getByRole('button', { name: 'Cancel' }).click()
        await expect(page.getByRole('button', { name: 'Cancel' })).toHaveCount(
            0,
        )
    }
})
