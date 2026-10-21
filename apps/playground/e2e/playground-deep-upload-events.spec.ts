import { expect, test } from '@playwright/test'

import {
    registerBrowserIssueGuards,
    TEXT_SENTINEL,
    textFile,
    largeTextFile,
    imageFile,
    generatedFile,
    uniqueRun,
    openPlayground,
    openCategory,
    checkSidebarCheckbox,
    setNumber,
    fillTextField,
    fillNestedTextField,
    getGeneratedCode,
    attachScreenshot,
    selectFiles,
} from './playground-deep-helpers'

registerBrowserIssueGuards()

test('runtime feature controls affect folder button, accept filter, editor button, and event log', async ({
    page,
}, testInfo) => {
    await openPlayground(page, `?mockRun=${uniqueRun('feature-runtime')}`)

    await openCategory(page, 'Sources')
    await checkSidebarCheckbox(page, 'Sources', 'Allow folder drag/drop')
    await checkSidebarCheckbox(page, 'Sources', 'Show Select Folder button')
    await expect(
        page.getByRole('button', { name: /select a folder/i }),
    ).toBeVisible()

    await openCategory(page, 'Limits')
    await fillTextField(page, 'Limits', 'Allowed file types', 'images')
    await expect(page.getByTestId('upup-file-input')).toHaveAttribute(
        'accept',
        'image/*',
    )

    await openCategory(page, 'Editor')
    await checkSidebarCheckbox(page, 'Editor', 'Enable image editor')
    await selectFiles(page, [imageFile('runtime-editor.png')])
    await expect(
        page.getByRole('button', { name: /edit image/i }),
    ).toBeVisible()
    await attachScreenshot(page, testInfo, 'runtime-editor-button-visible')
})

test('event toggles log selection, removal, prepare-files, and upload lifecycle', async ({
    page,
}, testInfo) => {
    await openPlayground(page, `?mockRun=${uniqueRun('events')}`)

    await openCategory(page, 'Events')
    for (const label of [
        'onFilesSelected',
        'onPrepareFiles',
        'onFileRemoved',
        'onUploadStart',
        'onFileUploadStart',
        'onFileUploadComplete',
        'onUploadComplete',
        'onStatusChange',
    ]) {
        await checkSidebarCheckbox(page, 'Events', label)
    }

    await selectFiles(page, [textFile('event-remove.txt')])
    await page.getByTestId('upup-file-remove').click()
    await expect(page.getByTestId('upup-file-item')).toHaveCount(0)

    await selectFiles(page, [textFile('event-upload.txt')])
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
    for (const eventName of [
        'onFilesSelected',
        'onFileRemoved',
        'onPrepareFiles',
        'onUploadStart',
        'onFileUploadStart',
        'onFileUploadComplete',
        'onUploadComplete',
        'onStatusChange',
    ]) {
        await expect(logList).toContainText(eventName)
    }

    await attachScreenshot(page, testInfo, 'event-log-runtime-lifecycle')
})

test('event log captures file clicks and concrete progress payloads during upload', async ({
    page,
}, testInfo) => {
    await openPlayground(page, `?mockRun=${uniqueRun('progress-events')}`)

    await openCategory(page, 'Events')
    for (const label of [
        'onFileClick',
        'onFileUploadProgress',
        'onFilesUploadProgress',
        'onFilesUploadComplete',
    ]) {
        await checkSidebarCheckbox(page, 'Events', label)
    }

    await selectFiles(page, [largeTextFile('progress-payload.txt')])
    await page.getByRole('button', { name: /click to preview/i }).click()
    await expect(
        page.locator('[data-upup-slot="file-preview-portal"]'),
    ).toContainText(TEXT_SENTINEL)
    await page.keyboard.press('Escape')

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
    await expect(logList).toContainText('onFileClick')
    await expect(logList).toContainText('progress-payload.txt')
    await expect(logList).toContainText('onFileUploadProgress')
    await expect(logList).toContainText('"loaded":')
    await expect(logList).toContainText('"total":')
    await expect(logList).toContainText('"percentage":100')
    await expect(logList).toContainText('onFilesUploadProgress')
    await expect(logList).toContainText('onFilesUploadComplete')
    await attachScreenshot(page, testInfo, 'event-log-progress-payloads')
})

test('limits concurrent direct uploads and shows live byte speed details', async ({
    page,
}, testInfo) => {
    let activePuts = 0
    let maxActivePuts = 0
    const completedPuts: string[] = []

    await page.route('**/api/upup-mock/object/**', async route => {
        if (route.request().method() !== 'PUT') {
            await route.continue()
            return
        }
        activePuts += 1
        maxActivePuts = Math.max(maxActivePuts, activePuts)
        try {
            // sleep-allow(mock PUT latency — holds each upload open long enough to observe the concurrency ceiling)
            await new Promise(resolve => setTimeout(resolve, 900))
            completedPuts.push(route.request().url())
            await route.fulfill({ status: 200, body: '' })
        } finally {
            activePuts -= 1
        }
    })

    await openPlayground(page, `?mockRun=${uniqueRun('concurrency')}`)
    await openCategory(page, 'Upload')
    await setNumber(page, 'Max concurrent uploads', '2')

    await selectFiles(page, [
        generatedFile('concurrent-1.txt', 512 * 1024),
        generatedFile('concurrent-2.txt', 512 * 1024),
        generatedFile('concurrent-3.txt', 512 * 1024),
        generatedFile('concurrent-4.txt', 512 * 1024),
        generatedFile('concurrent-5.txt', 512 * 1024),
    ])
    await page.getByTestId('upup-upload-btn').click()
    await expect(page.getByTestId('upup-root')).toHaveAttribute(
        'data-state',
        'uploading',
    )
    await expect(page.getByTestId('upup-root')).toContainText(/\bof\b/)
    await attachScreenshot(page, testInfo, 'concurrency-upload-ongoing')

    await expect(page.getByTestId('upup-root')).toHaveAttribute(
        'data-state',
        'successful',
    )
    expect(maxActivePuts).toBeLessThanOrEqual(2)
    expect(completedPuts).toHaveLength(5)
    await attachScreenshot(page, testInfo, 'concurrency-upload-success')
})

test('runs the checksum pipeline before deterministic mock upload and records upload events', async ({
    page,
}, testInfo) => {
    await openPlayground(page, `?mockRun=${uniqueRun('success')}`)
    await openCategory(page, 'Processing')
    await checkSidebarCheckbox(
        page,
        'Processing',
        'Checksum verification (SHA-256)',
    )

    await openCategory(page, 'Events')
    await checkSidebarCheckbox(page, 'Events', 'onFilesSelected')
    await checkSidebarCheckbox(page, 'Events', 'onUploadStart')
    await checkSidebarCheckbox(page, 'Events', 'onFileUploadStart')
    await checkSidebarCheckbox(page, 'Events', 'onFileUploadComplete')
    await checkSidebarCheckbox(page, 'Events', 'onUploadComplete')

    const presignBodies: Array<Record<string, any>> = []
    const presignStatuses: number[] = []
    const putStatuses: number[] = []

    page.on('request', request => {
        if (request.method() !== 'POST') return
        if (!request.url().includes('/api/upup-mock/presign')) return
        presignBodies.push(JSON.parse(request.postData() ?? '{}'))
    })

    page.on('response', response => {
        const url = response.url()
        if (url.includes('/api/upup-mock/presign'))
            presignStatuses.push(response.status())
        if (url.includes('/api/upup-mock/object/'))
            putStatuses.push(response.status())
    })

    await page.route('**/api/upup-mock/object/**', async route => {
        // sleep-allow(mock PUT latency — keeps the upload in-flight long enough for the checksum-pipeline UI state to render)
        await new Promise(resolve => setTimeout(resolve, 350))
        await route.continue()
    })

    await selectFiles(page, [textFile('checksum-pipeline.txt')])
    await attachScreenshot(page, testInfo, 'upload-ready')

    await page.getByTestId('upup-upload-btn').click()
    await expect(page.getByTestId('upup-root')).toHaveAttribute(
        'data-state',
        'uploading',
    )
    await attachScreenshot(page, testInfo, 'upload-in-progress')
    await expect(page.getByTestId('upup-root')).toHaveAttribute(
        'data-state',
        'successful',
    )
    await attachScreenshot(page, testInfo, 'upload-success')

    expect(presignStatuses).toEqual([200])
    expect(putStatuses).toEqual([200])
    expect(presignBodies).toHaveLength(1)
    expect(presignBodies[0].metadata?.checksum).toMatch(/^[0-9a-f]{64}$/)

    await page
        .locator('.upup-ie-tabs')
        .getByRole('button', { name: 'Events' })
        .click()
    await expect(page.locator('.upup-ie-eventlog-list')).toContainText(
        'onFilesSelected',
    )
    await expect(page.locator('.upup-ie-eventlog-list')).toContainText(
        'onUploadStart',
    )
    await expect(page.locator('.upup-ie-eventlog-list')).toContainText(
        'onFileUploadComplete',
    )
    await expect(page.locator('.upup-ie-eventlog-list')).toContainText(
        'onUploadComplete',
    )
})

test('sends presigned uploadHeaders on direct browser PUT uploads', async ({
    page,
}, testInfo) => {
    const putHeaders: string[] = []

    await page.route('**/api/upup-mock/presign**', async route => {
        const requestUrl = new URL(route.request().url())
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                key: 'signed-headers/signed-headers.txt',
                uploadUrl: `${requestUrl.origin}/api/upup-mock/object/signed-headers/signed-headers.txt`,
                publicUrl: `${requestUrl.origin}/api/upup-mock/object/signed-headers/signed-headers.txt`,
                uploadHeaders: {
                    'x-upup-test-header': 'signed-value',
                },
                expiresIn: 3600,
            }),
        })
    })

    await page.route(
        '**/api/upup-mock/object/signed-headers/**',
        async route => {
            const header = route.request().headers()['x-upup-test-header'] ?? ''
            putHeaders.push(header)
            await route.fulfill({
                status: header === 'signed-value' ? 200 : 400,
                contentType: 'application/json',
                body: JSON.stringify({ ok: header === 'signed-value' }),
            })
        },
    )

    await openPlayground(page, `?mockRun=${uniqueRun('signed-headers')}`)
    await selectFiles(page, [textFile('signed-headers.txt')])
    await page.getByTestId('upup-upload-btn').click()
    await expect(page.getByTestId('upup-root')).toHaveAttribute(
        'data-state',
        'successful',
    )

    expect(putHeaders).toEqual(['signed-value'])
    await attachScreenshot(page, testInfo, 'signed-upload-headers-success')
})

test('merges playground upload metadata into presign payloads and generated code', async ({
    page,
}, testInfo) => {
    const presignBodies: Array<Record<string, any>> = []
    page.on('request', request => {
        if (request.method() !== 'POST') return
        if (!request.url().includes('/api/upup-mock/presign')) return
        presignBodies.push(JSON.parse(request.postData() ?? '{}'))
    })

    await openPlayground(page, `?mockRun=${uniqueRun('metadata')}`)
    await openCategory(page, 'Advanced')
    await fillNestedTextField(
        page,
        'Advanced',
        'Upload metadata',
        'Trace ID',
        'trace-rec-25',
    )
    await fillNestedTextField(
        page,
        'Advanced',
        'Upload metadata',
        'Tenant ID',
        'tenant-alpha',
    )

    await selectFiles(page, [textFile('metadata-payload.txt')])
    await page.getByTestId('upup-upload-btn').click()
    await expect(page.getByTestId('upup-root')).toHaveAttribute(
        'data-state',
        'successful',
    )

    expect(presignBodies).toHaveLength(1)
    expect(presignBodies[0].metadata).toMatchObject({
        traceId: 'trace-rec-25',
        tenantId: 'tenant-alpha',
    })
    const code = await getGeneratedCode(page)
    expect(code).toContain('metadata')
    expect(code).toContain("traceId: 'trace-rec-25'")
    expect(code).toContain("tenantId: 'tenant-alpha'")
    await attachScreenshot(page, testInfo, 'metadata-presign-payload')
})
