import { expect, test } from '@playwright/test'

import {
    registerBrowserIssueGuards,
    textFile,
    imageFile,
    uniqueRun,
    openPlayground,
    openCategory,
    checkSidebarCheckbox,
    setNumber,
    fillTextField,
    fillNestedTextField,
    clickRadio,
    ensureSourceTile,
    getGeneratedCode,
    attachScreenshot,
    selectFiles,
    trySelectFiles,
} from './playground-deep-helpers'

registerBrowserIssueGuards()

test('runs external tus uploads without also keeping the playground presign endpoint', async ({
    page,
}, testInfo) => {
    await openPlayground(page, `?mockRun=${uniqueRun('tus')}`)

    await openCategory(page, 'Upload')
    await clickRadio(page, 'Upload', 'tus')
    await fillTextField(page, 'Upload', 'tus endpoint', '/api/upup-mock/tus')

    const tusStatuses: Array<{ method: string; status: number }> = []
    page.on('response', response => {
        const url = response.url()
        if (url.includes('/api/upup-mock/tus')) {
            tusStatuses.push({
                method: response.request().method(),
                status: response.status(),
            })
        }
    })

    await selectFiles(page, [textFile('external-tus.txt')])
    await page.getByTestId('upup-upload-btn').click()
    await expect(page.getByTestId('upup-root')).toHaveAttribute(
        'data-state',
        'successful',
    )
    await attachScreenshot(page, testInfo, 'tus-external-upload-success')

    expect(tusStatuses).toEqual([
        { method: 'POST', status: 201 },
        { method: 'PATCH', status: 204 },
    ])

    const code = await getGeneratedCode(page)
    expect(code).toContain("protocol: 'tus'")
    expect(code).toContain("endpoint: '/api/upup-mock/tus'")
    expect(code).not.toContain('uploadEndpoint=')
    expect(code).not.toContain('serverUrl=')
})

test('waits for playground SSE processing and logs onFileProcessed after upload', async ({
    page,
}, testInfo) => {
    await openPlayground(page, `?mockRun=${uniqueRun('sse')}`)

    await openCategory(page, 'Advanced')
    await fillTextField(
        page,
        'Advanced',
        'Processing endpoint (SSE)',
        '/api/upup-mock/processing',
    )

    await openCategory(page, 'Events')
    await checkSidebarCheckbox(page, 'Events', 'onFileProcessed')

    await expect
        .poll(async () => {
            const code = await getGeneratedCode(page)
            return (
                code.includes(
                    'processingEndpoint="/api/upup-mock/processing"',
                ) && code.includes('onFileProcessed')
            )
        })
        .toBe(true)
    await page
        .locator('.upup-ie-tabs')
        .getByRole('button', { name: 'Preview' })
        .click()

    const processingResponse = page.waitForResponse(
        response =>
            response.url().includes('/api/upup-mock/processing') &&
            response.status() === 200,
    )

    await selectFiles(page, [textFile('processing-sse.txt')])
    await page.getByTestId('upup-upload-btn').click()
    await expect(page.getByTestId('upup-root')).toHaveAttribute(
        'data-state',
        'successful',
    )
    await processingResponse

    await page
        .locator('.upup-ie-tabs')
        .getByRole('button', { name: 'Events' })
        .click()
    await expect(page.locator('.upup-ie-eventlog-list')).toContainText(
        'onFileProcessed',
    )
    await expect(page.locator('.upup-ie-eventlog-list')).toContainText(
        'processed',
    )
    await attachScreenshot(page, testInfo, 'sse-processing-event-log')
})

test('surfaces playground SSE processing timeout through onError without processed event', async ({
    page,
}, testInfo) => {
    await openPlayground(page, `?mockRun=${uniqueRun('sse-timeout')}`)

    await openCategory(page, 'Advanced')
    await fillTextField(
        page,
        'Advanced',
        'Processing endpoint (SSE)',
        '/api/upup-mock/processing?hang=1',
    )
    await setNumber(page, 'Processing timeout (ms)', '1000')

    await openCategory(page, 'Events')
    await checkSidebarCheckbox(page, 'Events', 'onFileProcessed')
    await checkSidebarCheckbox(page, 'Events', 'onError')

    await selectFiles(page, [textFile('processing-timeout.txt')])
    await page.getByTestId('upup-upload-btn').click()
    await expect(page.getByTestId('upup-root')).toHaveAttribute(
        'data-state',
        'successful',
    )

    await page
        .locator('.upup-ie-tabs')
        .getByRole('button', { name: 'Events' })
        .click()
    const logList = page.locator('.upup-ie-eventlog-list')
    await expect(logList).toContainText('onError')
    await expect(logList).toContainText('Processing timed out')
    await expect(logList).not.toContainText('onFileProcessed')
    await attachScreenshot(page, testInfo, 'sse-processing-timeout-error-log')
})

test('server-mode cloud drive browser lists, selects, and transfers a mocked file', async ({
    page,
}, testInfo) => {
    const transferBodies: Array<Record<string, unknown>> = []
    await page.route(
        '**/api/upup-server-mock/files/google-drive**',
        async route => {
            const request = route.request()
            if (request.method() === 'POST') {
                transferBodies.push(JSON.parse(request.postData() ?? '{}'))
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        key: 'server-drive/quarterly-report.pdf',
                        publicUrl: '/mock/quarterly-report.pdf',
                    }),
                })
                return
            }
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    files: [
                        {
                            id: 'folder-1',
                            name: 'Finance',
                            isFolder: true,
                        },
                        {
                            id: 'file-1',
                            name: 'quarterly-report.pdf',
                            size: 4096,
                            mimeType: 'application/pdf',
                            isFolder: false,
                        },
                    ],
                }),
            })
        },
    )

    await openPlayground(page)
    await openCategory(page, 'Advanced')
    await clickRadio(page, 'Advanced', 'server')
    await fillTextField(page, 'Advanced', 'Server URL', '/api/upup-server-mock')
    await fillNestedTextField(
        page,
        'Advanced',
        'Google Drive',
        'Client ID',
        'fake-google-client',
    )

    await openCategory(page, 'Sources')
    await ensureSourceTile(page, 'Google Drive')
    await page.getByTestId('upup-source-googleDrive').click()

    await expect(page.getByTestId('upup-server-drive-browser')).toBeVisible()
    await expect(page.getByTestId('upup-server-drive-browser')).toContainText(
        'quarterly-report.pdf',
    )
    await attachScreenshot(page, testInfo, 'server-mode-google-drive-list')

    await page.getByRole('button', { name: /quarterly-report\.pdf/i }).click()
    await page.getByRole('button', { name: /Add files \(1\)/ }).click()
    await expect(page.getByTestId('upup-server-drive-browser')).toHaveCount(0)
    expect(transferBodies).toEqual([
        {
            fileId: 'file-1',
            fileName: 'quarterly-report.pdf',
            size: 4096,
            mimeType: 'application/pdf',
        },
    ])
    await attachScreenshot(
        page,
        testInfo,
        'server-mode-google-drive-transfer-complete',
    )
})

test('theme slot overrides are reflected in the live uploader DOM', async ({
    page,
}, testInfo) => {
    await openPlayground(page)

    await openCategory(page, 'Appearance')
    await fillNestedTextField(
        page,
        'Appearance',
        'Slot overrides (className strings)',
        'uploader.container',
        'e2e-uploader-container',
    )
    await fillNestedTextField(
        page,
        'Appearance',
        'Slot overrides (className strings)',
        'fileList.uploadButton',
        'e2e-upload-button',
    )
    await fillNestedTextField(
        page,
        'Appearance',
        'Slot overrides (className strings)',
        'progressBar.fill',
        'e2e-progress-fill',
    )
    await fillNestedTextField(
        page,
        'Appearance',
        'Slot overrides (className strings)',
        'urlUploader.fetchButton',
        'e2e-url-fetch',
    )

    await expect(page.getByTestId('upup-container')).toHaveClass(
        /e2e-uploader-container/,
    )
    await page.getByTestId('upup-source-url').click()
    await expect(
        page
            .getByTestId('upup-url-uploader')
            .getByRole('button', { name: 'Fetch' }),
    ).toHaveClass(/e2e-url-fetch/)
    await page.getByRole('button', { name: 'Cancel' }).click()

    await selectFiles(page, [textFile('themed-file.txt')])
    await expect(page.getByTestId('upup-upload-btn')).toHaveClass(
        /e2e-upload-button/,
    )
    await page.getByTestId('upup-upload-btn').click()
    await expect(page.getByTestId('upup-root')).toHaveAttribute(
        'data-state',
        'successful',
    )
    await expect(page.locator('.e2e-progress-fill')).toHaveCount(2)
    await attachScreenshot(page, testInfo, 'theme-slot-overrides-live-dom')
})

test('modal image editor lazy-loads and can be dismissed after auto-open', async ({
    page,
}, testInfo) => {
    await openPlayground(page)

    await openCategory(page, 'Editor')
    await checkSidebarCheckbox(page, 'Editor', 'Enable image editor')
    await clickRadio(page, 'Editor', 'modal')
    await clickRadio(page, 'Editor', 'When 1 image is added')

    await trySelectFiles(page, [imageFile('editor-modal.png')])
    const dialog = page.getByRole('dialog', {
        name: /Edit image: editor-modal\.png/,
    })
    await expect(dialog).toBeVisible({ timeout: 30_000 })
    await attachScreenshot(page, testInfo, 'image-editor-modal-open')

    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
})
