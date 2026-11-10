import { expect, test } from '@playwright/test'

import {
    registerBrowserIssueGuards,
    allowExpectedMockFailure,
    textFile,
    imageFile,
    uniqueRun,
    openPlayground,
    category,
    openCategory,
    checkSidebarCheckbox,
    uncheckSidebarCheckbox,
    setNumber,
    fillTextField,
    fillNestedTextField,
    setSizeUnit,
    getGeneratedCode,
    attachScreenshot,
    selectFiles,
    trySelectFiles,
} from './playground-deep-helpers'

registerBrowserIssueGuards()

test('runs image processing pipeline steps and sends metadata to the mock presign route', async ({
    page,
}, testInfo) => {
    await openPlayground(page, `?mockRun=${uniqueRun('image-pipeline')}`)

    await openCategory(page, 'Processing')
    for (const label of [
        'Generate thumbnails',
        'Checksum verification (SHA-256)',
        'Strip EXIF data',
    ]) {
        await checkSidebarCheckbox(page, 'Processing', label)
    }

    await selectFiles(page, [imageFile('pipeline-image.png')])

    const presignRequest = page.waitForRequest(
        request =>
            request.method() === 'POST' &&
            request.url().includes('/api/upup-mock/presign'),
    )
    await page.getByTestId('upup-upload-btn').click()
    const request = await presignRequest
    const body = request.postDataJSON() as {
        metadata?: Record<string, unknown>
    }

    expect(body.metadata?.checksum).toMatch(/^[a-f0-9]{64}$/)
    expect(body.metadata?.originalContentHash).toBe(body.metadata?.checksum)
    expect(body.metadata?.thumbnailUrl).toMatch(/^data:image\/jpeg;base64,/)
    expect(body.metadata?.exifStripped).toBe(true)
    expect(body.metadata?.originalSize).toBeGreaterThan(0)
    expect(body.metadata?.processedSize).toBeGreaterThan(0)
    await expect(page.getByTestId('upup-root')).toHaveAttribute(
        'data-state',
        'successful',
    )
    await attachScreenshot(page, testInfo, 'image-pipeline-metadata-upload')
})

test('shows failure state, visible retry control, then succeeds after one mock failure', async ({
    page,
}, testInfo) => {
    await openPlayground(
        page,
        `?mockFailure=once&mockRun=${uniqueRun('retry')}`,
    )
    allowExpectedMockFailure.add(page)
    await setNumber(page, 'Max retries', '0')

    const presignStatuses: number[] = []
    const putStatuses: number[] = []
    page.on('response', response => {
        const url = response.url()
        if (url.includes('/api/upup-mock/presign'))
            presignStatuses.push(response.status())
        if (url.includes('/api/upup-mock/object/'))
            putStatuses.push(response.status())
    })

    await selectFiles(page, [textFile('retry-once.txt')])
    await page.getByTestId('upup-upload-btn').click()
    await expect(page.getByTestId('upup-root')).toHaveAttribute(
        'data-state',
        'failed',
    )
    await expect(page.getByTestId('upup-retry-btn')).toBeVisible()
    await attachScreenshot(page, testInfo, 'upload-failed-retry-visible')

    await page.getByTestId('upup-retry-btn').click()
    await expect(page.getByTestId('upup-root')).toHaveAttribute(
        'data-state',
        'successful',
    )
    await attachScreenshot(page, testInfo, 'retry-success')

    expect(presignStatuses).toEqual([503, 200])
    expect(putStatuses).toEqual([200])
})

test('applies theme, Arabic RTL locale, and opens the URL source panel without runtime errors', async ({
    page,
}, testInfo) => {
    await openPlayground(page)
    const container = page.getByTestId('upup-container')
    const lightBackground = await container.evaluate(
        el => getComputedStyle(el).backgroundColor,
    )

    await openCategory(page, 'Appearance')
    await page.getByRole('radio', { name: 'dark' }).click()
    await expect
        .poll(async () =>
            container.evaluate(el => getComputedStyle(el).backgroundColor),
        )
        .not.toBe(lightBackground)

    await openCategory(page, 'Language')
    await category(page, 'Language')
        .getByRole('combobox', { name: /^Locale\b/ })
        .selectOption('ar-SA')
    await expect(page.getByTestId('upup-root')).toHaveAttribute('dir', 'rtl')
    await expect(page.getByTestId('upup-root')).toHaveAttribute('lang', 'ar-SA')
    await expect(page.getByTestId('upup-browse-files')).toContainText(
        '\u062A\u0635\u0641\u062D \u0627\u0644\u0645\u0644\u0641\u0627\u062A',
    )

    await page.getByTestId('upup-source-url').click()
    await expect(page.getByTestId('upup-url-uploader')).toBeVisible()
    await expect(page.locator('input[type="url"]')).toHaveAttribute(
        'placeholder',
        '\u0623\u062F\u062E\u0644 \u0631\u0627\u0628\u0637 \u0627\u0644\u0645\u0644\u0641',
    )

    await attachScreenshot(page, testInfo, 'dark-rtl-url-source')
})

test('message overrides update visible uploader labels and generated ICU code', async ({
    page,
}, testInfo) => {
    await openPlayground(page)

    await openCategory(page, 'Language')
    await fillNestedTextField(
        page,
        'Language',
        'Message overrides (visible labels)',
        'dropzone.browseFiles',
        'choose files',
    )
    await fillNestedTextField(
        page,
        'Language',
        'Message overrides (visible labels)',
        'header.filesSelected',
        '{count, plural, one {# item ready} other {# items ready}}',
    )
    await fillNestedTextField(
        page,
        'Language',
        'Message overrides (visible labels)',
        'fileList.uploadFiles',
        'Send now',
    )

    await expect(page.getByTestId('upup-browse-files')).toContainText(
        'choose files',
    )
    await selectFiles(page, [textFile('message-overrides.txt')])
    await expect(page.getByTestId('upup-header')).toContainText('1 item ready')
    await expect(page.getByTestId('upup-upload-btn')).toHaveText('Send now')
    await attachScreenshot(page, testInfo, 'visible-message-overrides')

    const code = await getGeneratedCode(page)
    expect(code).toContain("browseFiles: 'choose files'")
    expect(code).toContain(
        "filesSelected: '{count, plural, one {# item ready} other {# items ready}}'",
    )
    expect(code).toContain("uploadFiles: 'Send now'")
})

test('local-only configuration keeps selected File objects usable and omits upload targets from code', async ({
    page,
}, testInfo) => {
    await openPlayground(page)

    await openCategory(page, 'Advanced')
    await fillTextField(page, 'Advanced', 'Upload endpoint', '')

    await openCategory(page, 'Events')
    await checkSidebarCheckbox(page, 'Events', 'onFilesSelected')

    await selectFiles(page, [textFile('local-only-file.txt')])
    await expect(page.getByTestId('upup-file-list')).toContainText(
        'local-only-file.txt',
    )
    await expect(page.getByTestId('upup-root')).toHaveAttribute(
        'data-state',
        'idle',
    )

    await page
        .locator('.upup-ie-tabs')
        .getByRole('button', { name: 'Events' })
        .click()
    await expect(page.locator('.upup-ie-eventlog-list')).toContainText(
        'onFilesSelected',
    )
    await expect(page.locator('.upup-ie-eventlog-list')).toContainText(
        'Array(1)',
    )

    const code = await getGeneratedCode(page)
    expect(code).not.toContain('uploadEndpoint=')
    expect(code).not.toContain('serverUrl=')
    await attachScreenshot(page, testInfo, 'local-only-selected-file')
})

test('skips duplicate file content when content deduplication is enabled in the playground', async ({
    page,
}, testInfo) => {
    await openPlayground(page)
    await openCategory(page, 'Processing')
    await checkSidebarCheckbox(page, 'Processing', 'Content deduplication')

    const duplicateContent = Buffer.from(
        'same file content from two differently named files',
    )
    await page.getByTestId('upup-file-input').setInputFiles([
        {
            name: 'duplicate-a.txt',
            mimeType: 'text/plain',
            buffer: duplicateContent,
        },
        {
            name: 'duplicate-b.txt',
            mimeType: 'text/plain',
            buffer: duplicateContent,
        },
    ])

    await expect(page.getByTestId('upup-file-list')).toBeVisible()
    await expect(page.getByTestId('upup-file-item')).toHaveCount(1)
    await expect(page.getByTestId('upup-file-list')).toContainText(
        'duplicate-a.txt',
    )
    await attachScreenshot(page, testInfo, 'content-deduplication-single-file')
})

test('rejects invalid runtime selections and logs validation callback payloads', async ({
    page,
}, testInfo) => {
    await openPlayground(page)

    await openCategory(page, 'Limits')
    await fillTextField(page, 'Limits', 'Allowed file types', 'images')
    await setSizeUnit(page, 'Limits', 'Max file size', '1', 'B')

    await openCategory(page, 'Events')
    for (const label of [
        'onBeforeFileAdded',
        'onFileTypeMismatch',
        'onRestrictionFailed',
        'onError',
    ]) {
        await checkSidebarCheckbox(page, 'Events', label)
    }

    await trySelectFiles(page, [textFile('wrong-type.txt')])
    await expect(page.getByTestId('upup-file-item')).toHaveCount(0)

    await trySelectFiles(page, [imageFile('too-large.png')])
    await expect(page.getByTestId('upup-file-item')).toHaveCount(0)

    await page
        .locator('.upup-ie-tabs')
        .getByRole('button', { name: 'Events' })
        .click()
    const logList = page.locator('.upup-ie-eventlog-list')
    await expect(logList).toContainText('onBeforeFileAdded')
    await expect(logList).toContainText('onFileTypeMismatch')
    await expect(logList).toContainText('onRestrictionFailed')
    await expect(logList).toContainText('TYPE_MISMATCH')
    await expect(logList).toContainText('FILE_TOO_LARGE')
    await expect(logList).toContainText('onError')

    await attachScreenshot(page, testInfo, 'validation-events-type-and-size')
})

test('auto upload, mini mode, preview-off, branding-off, and done reset work together', async ({
    page,
}, testInfo) => {
    await openPlayground(page, `?mockRun=${uniqueRun('auto-mini')}`)

    await openCategory(page, 'Upload')
    await checkSidebarCheckbox(page, 'Upload', 'Auto upload')

    await openCategory(page, 'Behavior')
    await checkSidebarCheckbox(page, 'Behavior', 'Mini mode')
    await uncheckSidebarCheckbox(page, 'Behavior', 'Allow file preview')
    await uncheckSidebarCheckbox(page, 'Behavior', 'Show upup branding')

    await openCategory(page, 'Events')
    await checkSidebarCheckbox(page, 'Events', 'onUploadStart')
    await checkSidebarCheckbox(page, 'Events', 'onUploadComplete')
    await checkSidebarCheckbox(page, 'Events', 'onDoneClicked')
    await checkSidebarCheckbox(page, 'Events', 'onStatusChange')

    await trySelectFiles(page, [textFile('auto-mini.txt')])
    await expect(page.getByTestId('upup-root')).toHaveAttribute(
        'data-state',
        'successful',
    )
    await expect(
        page.getByRole('button', { name: /click to preview/i }),
    ).toHaveCount(0)
    await expect(page.getByTestId('upup-branding')).toHaveCount(0)
    await attachScreenshot(page, testInfo, 'auto-upload-mini-success')

    await page.getByRole('button', { name: 'Done' }).click()
    await expect(page.getByTestId('upup-file-item')).toHaveCount(0)
    await expect(page.getByTestId('upup-root')).toHaveAttribute(
        'data-state',
        'idle',
    )

    await page
        .locator('.upup-ie-tabs')
        .getByRole('button', { name: 'Events' })
        .click()
    const logList = page.locator('.upup-ie-eventlog-list')
    await expect(logList).toContainText('onUploadStart')
    await expect(logList).toContainText('onUploadComplete')
    await expect(logList).toContainText('onDoneClicked')
    await expect(logList).toContainText('onStatusChange')
    await attachScreenshot(page, testInfo, 'auto-upload-mini-event-log')
})
