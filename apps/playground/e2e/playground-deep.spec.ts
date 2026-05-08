import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test'

type BrowserIssue = {
    source: 'console' | 'pageerror' | 'requestfailed'
    text: string
}

const browserIssues = new WeakMap<Page, BrowserIssue[]>()
const allowExpectedMockFailure = new WeakSet<Page>()

const TEXT_SENTINEL = 'PLAYGROUND_TEXT_PREVIEW_SENTINEL'
const TEXT_CONTENT = [
    'Upup playground deep acceptance file.',
    TEXT_SENTINEL,
    'This proves the browser loaded a real File object and rendered its preview portal.',
].join('\n')

const RED_PNG_BASE64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAGElEQVR42mP8z8Dwn4GBgYGJAQoAABQABAP8zM2tAAAAAElFTkSuQmCC'

function textFile(name = 'playground-note.txt') {
    return {
        name,
        mimeType: 'text/plain',
        buffer: Buffer.from(TEXT_CONTENT),
    }
}

function imageFile(name = 'preview-image.png') {
    return {
        name,
        mimeType: 'image/png',
        buffer: Buffer.from(RED_PNG_BASE64, 'base64'),
    }
}

function smallBinaryFile(name = 'tiny.bin') {
    return {
        name,
        mimeType: 'application/octet-stream',
        buffer: Buffer.from([1, 2, 3, 4]),
    }
}

function uniqueRun(label: string): string {
    return `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

async function openPlayground(page: Page, query = ''): Promise<void> {
    await page.addInitScript(() => {
        window.localStorage.setItem('upup-ie:sidebar-tier', 'advanced')
        window.localStorage.setItem('theme', 'light')
    })

    await page.goto(`/${query}`)
    await expect(page.getByRole('heading', { name: 'Upup Playground' })).toBeVisible()
    await expect(page.getByTestId('upup-root')).toBeVisible()
    await expect(page.getByTestId('upup-dropzone')).toBeVisible()
}

function category(page: Page, label: string) {
    return page.locator('section.upup-ie-category').filter({
        has: page.locator('.upup-ie-category-label', { hasText: label }),
    })
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function openCategory(page: Page, label: string): Promise<void> {
    const section = category(page, label).first()
    await expect(section).toBeVisible()
    if ((await section.getAttribute('data-open')) !== 'true') {
        await section.locator('.upup-ie-category-header').click()
    }
    await expect(section).toHaveAttribute('data-open', 'true')
}

async function checkSidebarCheckbox(page: Page, categoryLabel: string, label: string): Promise<void> {
    await category(page, categoryLabel)
        .getByRole('checkbox', { name: new RegExp(`^${escapeRegExp(label)}(?:\\s|$)`) })
        .check()
}

async function uncheckSidebarCheckbox(page: Page, categoryLabel: string, label: string): Promise<void> {
    await category(page, categoryLabel)
        .getByRole('checkbox', { name: new RegExp(`^${escapeRegExp(label)}(?:\\s|$)`) })
        .uncheck()
}

async function setNumber(page: Page, label: string, value: string): Promise<void> {
    const input = labelledField(page, page.locator('body'), label).locator('input[type="number"]').first()
    await input.fill(value)
    await input.blur()
}

function labelledField(page: Page, scope: Locator, label: string): Locator {
    return scope.locator('.upup-ie-field').filter({
        has: page.locator('.upup-ie-field-label', { hasText: new RegExp(`^${escapeRegExp(label)}$`) }),
    }).first()
}

function nestedFieldset(page: Page, categoryLabel: string, legend: string): Locator {
    return category(page, categoryLabel).locator('fieldset.upup-ie-nested').filter({
        has: page.locator('legend', { hasText: new RegExp(`^${escapeRegExp(legend)}$`) }),
    }).first()
}

async function fillTextField(page: Page, categoryLabel: string, label: string, value: string): Promise<void> {
    const field = labelledField(page, category(page, categoryLabel), label)
    await field.locator('input[type="text"], input:not([type])').first().fill(value)
}

async function fillNestedTextField(
    page: Page,
    categoryLabel: string,
    legend: string,
    label: string,
    value: string,
): Promise<void> {
    const field = labelledField(page, nestedFieldset(page, categoryLabel, legend), label)
    await field.locator('input[type="text"], input:not([type])').first().fill(value)
}

async function clickRadio(page: Page, categoryLabel: string, label: string): Promise<void> {
    const radio = category(page, categoryLabel)
        .getByRole('radio', { name: new RegExp(escapeRegExp(label), 'i') })
        .first()
    if ((await radio.getAttribute('aria-checked')) !== 'true') {
        await radio.click()
    }
}

async function selectOption(page: Page, categoryLabel: string, label: string, value: string): Promise<void> {
    const field = labelledField(page, category(page, categoryLabel), label)
    await field.locator('select').selectOption(value)
}

async function setSizeUnit(
    page: Page,
    categoryLabel: string,
    label: string,
    size: string,
    unit: 'B' | 'KB' | 'MB' | 'GB',
): Promise<void> {
    const field = labelledField(page, category(page, categoryLabel), label)
    await field.locator('input[type="number"]').fill(size)
    const unitButton = field.getByRole('radio', { name: unit, exact: true })
    if ((await unitButton.getAttribute('aria-checked')) !== 'true') {
        await unitButton.click()
    }
}

async function setRangeField(page: Page, categoryLabel: string, label: string, value: string): Promise<void> {
    const field = labelledField(page, category(page, categoryLabel), label)
    await field.locator('input[type="range"]').evaluate((input, nextValue) => {
        const range = input as HTMLInputElement
        const setter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            'value',
        )?.set
        setter?.call(range, nextValue)
        range.dispatchEvent(new Event('input', { bubbles: true }))
        range.dispatchEvent(new Event('change', { bubbles: true }))
    }, value)
}

async function fillColorField(page: Page, categoryLabel: string, label: string, value: string): Promise<void> {
    const field = labelledField(page, category(page, categoryLabel), label)
    await field.locator('input.upup-ie-color-hex').fill(value)
}

async function ensureSourceTile(page: Page, label: string): Promise<void> {
    const tile = category(page, 'Sources').getByRole('button', {
        name: new RegExp(`^${escapeRegExp(label)}$`),
    })
    if ((await tile.getAttribute('aria-pressed')) !== 'true') {
        await tile.click()
    }
    await expect(tile).toHaveAttribute('aria-pressed', 'true')
}

async function getGeneratedCode(page: Page): Promise<string> {
    await page.locator('.upup-ie-tabs').getByRole('button', { name: 'Code' }).click()
    const code = await page.locator('.upup-ie-code-pre').textContent()
    return code ?? ''
}

async function attachScreenshot(page: Page, testInfo: TestInfo, name: string, fullPage = false): Promise<void> {
    const path = testInfo.outputPath(`${name}.png`)
    await page.screenshot({ path, fullPage })
    await testInfo.attach(name, { path, contentType: 'image/png' })
}

async function selectFiles(page: Page, files: ReturnType<typeof textFile>[]): Promise<void> {
    await page.getByTestId('upup-file-input').setInputFiles(files)
    await expect(page.getByTestId('upup-file-list')).toBeVisible()
}

async function trySelectFiles(page: Page, files: ReturnType<typeof textFile>[]): Promise<void> {
    await page.getByTestId('upup-file-input').setInputFiles(files)
}

async function dispatchDrop(page: Page, file: ReturnType<typeof textFile>): Promise<void> {
    const dataTransfer = await page.evaluateHandle(({ name, mimeType, bytes }) => {
        const dt = new DataTransfer()
        dt.items.add(new File([new Uint8Array(bytes)], name, { type: mimeType }))
        return dt
    }, {
        name: file.name,
        mimeType: file.mimeType,
        bytes: [...file.buffer],
    })
    await page.getByTestId('upup-dropzone').dispatchEvent('dragover', { dataTransfer })
    await page.getByTestId('upup-dropzone').dispatchEvent('dragleave', { dataTransfer })
    await page.getByTestId('upup-dropzone').dispatchEvent('dragover', { dataTransfer })
    await page.getByTestId('upup-dropzone').dispatchEvent('drop', { dataTransfer })
}

async function dispatchPaste(page: Page, file: ReturnType<typeof imageFile>): Promise<void> {
    await page.getByTestId('upup-dropzone').evaluate((el, payload) => {
        const dt = new DataTransfer()
        dt.items.add(new File([new Uint8Array(payload.bytes)], payload.name, { type: payload.mimeType }))
        const event = new ClipboardEvent('paste', { bubbles: true, cancelable: true })
        Object.defineProperty(event, 'clipboardData', { value: dt })
        el.dispatchEvent(event)
    }, {
        name: file.name,
        mimeType: file.mimeType,
        bytes: [...file.buffer],
    })
}

test.beforeEach(async ({ page }) => {
    const issues: BrowserIssue[] = []
    browserIssues.set(page, issues)

    page.on('console', (message) => {
        if (message.type() !== 'error') return
        issues.push({ source: 'console', text: message.text() })
    })

    page.on('pageerror', (error) => {
        issues.push({ source: 'pageerror', text: error.message })
    })

    page.on('requestfailed', (request) => {
        const url = request.url()
        if (url.includes('/_next/webpack-hmr')) return
        if (url.startsWith('blob:')) return
        if (url.includes('/api/upup-mock/processing') && request.failure()?.errorText === 'net::ERR_ABORTED') return
        if (url.includes('/api/upup-server-mock/files/') && request.failure()?.errorText === 'net::ERR_ABORTED') return
        issues.push({
            source: 'requestfailed',
            text: `${request.method()} ${url}: ${request.failure()?.errorText ?? 'failed'}`,
        })
    })
})

test.afterEach(async ({ page }) => {
    const issues = (browserIssues.get(page) ?? []).filter((issue) => {
        if (
            allowExpectedMockFailure.has(page) &&
            issue.source === 'console' &&
            issue.text.includes('503')
        ) {
            return false
        }
        return true
    })
    expect(issues).toEqual([])
})

test('renders the real playground shell, uploader, source controls, and generated code', async ({ page }, testInfo) => {
    await openPlayground(page)

    await expect(page.getByRole('tab', { name: 'Advanced' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Preview' })).toHaveClass(/is-active/)
    await expect(page.getByTestId('upup-source-local')).toBeVisible()
    await expect(page.getByTestId('upup-source-url')).toBeVisible()
    await expect(page.getByTestId('upup-container')).toBeVisible()

    await page.locator('.upup-ie-tabs').getByRole('button', { name: 'Code' }).click()
    await expect(page.locator('.upup-ie-code-pre')).toContainText("import { UpupUploader } from '@upup/react'")
    await expect(page.locator('.upup-ie-code-pre')).toContainText('uploadEndpoint=')

    await attachScreenshot(page, testInfo, 'desktop-shell-code')
})

test('assistant canned prompts apply deterministic local patches without Mastra', async ({ page }, testInfo) => {
    await openPlayground(page, `?mockRun=${uniqueRun('assistant-fallback')}`)

    await page.getByRole('button', { name: 'Add Google Drive and Dropbox' }).click()

    await expect(page.getByRole('button', { name: 'Google Drive' }).last()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Dropbox' }).last()).toBeVisible()
    await expect(page.getByText('Applied:')).toBeVisible()
    await expect(page.getByText('Enabled Google Drive and Dropbox sources.').last()).toBeVisible()

    const code = await getGeneratedCode(page)
    expect(code).toContain('sources={[')
    expect(code).toContain("'googleDrive'")
    expect(code).toContain("'dropbox'")
    await attachScreenshot(page, testInfo, 'assistant-local-fallback', true)
})

test('defaults keep optional integrations out of the live uploader until explicitly enabled', async ({ page }, testInfo) => {
    await openPlayground(page)

    for (const id of ['local', 'url', 'camera', 'microphone', 'screen']) {
        await expect(page.getByTestId(`upup-source-${id}`)).toBeVisible()
    }
    for (const id of ['googleDrive', 'oneDrive', 'dropbox', 'box']) {
        await expect(page.getByTestId(`upup-source-${id}`)).toHaveCount(0)
    }
    await expect(page.getByRole('button', { name: /select a folder/i })).toHaveCount(0)

    await selectFiles(page, [imageFile('editor-default-off.png')])
    await expect(page.getByRole('button', { name: /edit image/i })).toHaveCount(0)
    await attachScreenshot(page, testInfo, 'default-optional-integrations-off')
})

test('wires every playground category into copy-pasteable generated code', async ({ page }, testInfo) => {
    await openPlayground(page)

    await openCategory(page, 'Upload')
    await clickRadio(page, 'Upload', 'backblaze')
    await setNumber(page, 'Max concurrent uploads', '5')
    await setNumber(page, 'Max retries', '2')
    await checkSidebarCheckbox(page, 'Upload', 'Auto upload')
    await checkSidebarCheckbox(page, 'Upload', 'Crash recovery (IndexedDB)')
    await clickRadio(page, 'Upload', 'tus')
    await setSizeUnit(page, 'Upload', 'Chunk size', '6', 'MB')
    await fillTextField(page, 'Upload', 'tus endpoint', 'https://tus.example.com/files')

    await openCategory(page, 'Advanced')
    await clickRadio(page, 'Advanced', 'server')
    await fillTextField(page, 'Advanced', 'Server URL', '/api/upup')
    await fillTextField(page, 'Advanced', 'Processing endpoint (SSE)', '/api/processing/status')
    await setNumber(page, 'Processing timeout (ms)', '120000')
    await checkSidebarCheckbox(page, 'Advanced', 'Dangerously auto-configure')
    await fillNestedTextField(page, 'Advanced', 'CORS', 'Allowed origins', 'http://localhost:3000, https://example.com')
    await fillNestedTextField(page, 'Advanced', 'Google Drive', 'Client ID', 'gd-client')
    await fillNestedTextField(page, 'Advanced', 'Google Drive', 'API Key', 'gd-key')
    await fillNestedTextField(page, 'Advanced', 'Google Drive', 'App ID', 'gd-app')
    await fillNestedTextField(page, 'Advanced', 'OneDrive', 'Client ID', 'od-client')
    await fillNestedTextField(page, 'Advanced', 'Dropbox', 'Client ID', 'dbx-client')
    await fillNestedTextField(page, 'Advanced', 'Box', 'Client ID', 'box-client')

    await openCategory(page, 'Sources')
    for (const label of ['Google Drive', 'OneDrive', 'Dropbox', 'Box']) {
        await ensureSourceTile(page, label)
    }
    await checkSidebarCheckbox(page, 'Sources', 'Allow folders')
    await checkSidebarCheckbox(page, 'Sources', 'Show folder button')

    await openCategory(page, 'Limits')
    await fillTextField(page, 'Limits', 'Allowed file types', 'images')
    await setNumber(page, 'Max files', '2')
    await setSizeUnit(page, 'Limits', 'Max file size', '1', 'KB')
    await setSizeUnit(page, 'Limits', 'Min file size', '1', 'B')
    await setSizeUnit(page, 'Limits', 'Max total file size', '3', 'KB')

    await openCategory(page, 'Processing')
    for (const label of [
        'Compress images',
        'Generate thumbnails',
        'Checksum verification (SHA-256)',
        'HEIC → JPEG conversion',
        'Strip EXIF data',
        'Content deduplication',
    ]) {
        await checkSidebarCheckbox(page, 'Processing', label)
    }

    await openCategory(page, 'Editor')
    await checkSidebarCheckbox(page, 'Editor', 'Enable image editor')
    await clickRadio(page, 'Editor', 'modal')
    await clickRadio(page, 'Editor', 'When 1 image is added')
    await setRangeField(page, 'Editor', 'Output quality', '0.65')

    await openCategory(page, 'Behavior')
    await checkSidebarCheckbox(page, 'Behavior', 'Mini mode')
    await checkSidebarCheckbox(page, 'Behavior', 'Enable paste upload')
    await uncheckSidebarCheckbox(page, 'Behavior', 'Allow file preview')
    await uncheckSidebarCheckbox(page, 'Behavior', 'Show upup branding')
    await checkSidebarCheckbox(page, 'Behavior', 'Demo: show loading state')

    await openCategory(page, 'Appearance')
    await clickRadio(page, 'Appearance', 'system')
    await fillColorField(page, 'Appearance', 'Primary color', '#ff0066')
    await fillNestedTextField(page, 'Appearance', 'Slot overrides (className strings)', 'uploader.container', 'ring-4 ring-pink-500')
    await fillNestedTextField(page, 'Appearance', 'Slot overrides (className strings)', 'fileList.root', 'bg-slate-50')
    await fillNestedTextField(page, 'Appearance', 'Slot overrides (className strings)', 'fileList.uploadButton', 'bg-emerald-600 text-white')
    await fillNestedTextField(page, 'Appearance', 'Slot overrides (className strings)', 'filePreview.deleteButton', 'bg-red-500 text-white')
    await fillNestedTextField(page, 'Appearance', 'Slot overrides (className strings)', 'progressBar.fill', 'bg-pink-500')
    await fillNestedTextField(page, 'Appearance', 'Slot overrides (className strings)', 'sourceSelector.adapterButton', 'rounded-md border')
    await fillNestedTextField(page, 'Appearance', 'Slot overrides (className strings)', 'sourceView.header', 'border-b px-4')
    await fillNestedTextField(page, 'Appearance', 'Slot overrides (className strings)', 'urlUploader.fetchButton', 'bg-slate-900 text-white')
    await fillTextField(page, 'Appearance', 'Root className', 'max-w-xl')

    await openCategory(page, 'Language')
    await selectOption(page, 'Language', 'Locale', 'ar-SA')
    await selectOption(page, 'Language', 'Fallback locale', 'fr-FR')
    await fillNestedTextField(page, 'Language', 'Message overrides (common subset)', 'common.upload', 'Send now')
    await fillNestedTextField(page, 'Language', 'Message overrides (common subset)', 'common.cancel', 'Stop')
    await fillNestedTextField(page, 'Language', 'Message overrides (common subset)', 'dropzone.label', 'Add files')
    await fillNestedTextField(page, 'Language', 'Message overrides (common subset)', 'header.filesSelected', '{n} ready')

    await openCategory(page, 'Events')
    for (const checkbox of await category(page, 'Events').getByRole('checkbox').all()) {
        await checkbox.check()
    }

    const code = await getGeneratedCode(page)
    await attachScreenshot(page, testInfo, 'feature-matrix-generated-code', true)

    for (const text of [
        "import { arSA, frFR } from '@upup/core'",
        'provider="backblaze"',
        'maxConcurrentUploads={5}',
        'maxRetries={2}',
        'autoUpload',
        'crashRecovery',
        "protocol: 'tus'",
        'chunkSizeBytes: 6291456',
        "endpoint: 'https://tus.example.com/files'",
        "processingEndpoint=\"/api/processing/status\"",
        'processingTimeout={120000}',
        'dangerouslyAutoConfigure: true',
        'allowedOrigins: [',
        "'http://localhost:3000'",
        "'https://example.com'",
        'folderUpload={{',
        'enabled: true',
        'showPickerButton: true',
        "allowedFileTypes=\"images\"",
        'maxFiles={2}',
        'maxFileSize={{',
        'minFileSize={{',
        'maxTotalFileSize={{',
        'imageCompression',
        'thumbnailGenerator',
        'checksumVerification',
        'heicConversion',
        'stripExifData',
        'contentDeduplication',
        'imageEditor={{',
        "display: 'modal'",
        "autoOpen: 'single'",
        'quality: 0.65',
        'mini',
        'enablePaste',
        'allowPreview={false}',
        'showBranding={false}',
        'isProcessing',
        "mode: 'system'",
        "primary: '#ff0066'",
        "className=\"max-w-xl\"",
        'locale: arSA',
        'fallbackLocale: frFR',
        "common: {",
        "upload: 'Send now'",
        "dropzone: {",
        "label: 'Add files'",
        "cloudDrives={{",
        "clientId: 'gd-client'",
        "apiKey: 'gd-key'",
        "appId: 'gd-app'",
        "clientId: 'od-client'",
        "clientId: 'dbx-client'",
        "clientId: 'box-client'",
    ]) {
        expect(code).toContain(text)
    }

    for (const source of ['local', 'url', 'camera', 'microphone', 'screen', 'googleDrive', 'oneDrive', 'dropbox', 'box']) {
        expect(code).toContain(`'${source}'`)
    }

    for (const eventName of [
        'onFilesSelected',
        'onFileClick',
        'onDoneClicked',
        'onIntegrationClick',
        'onBeforeFileAdded',
        'onPrepareFiles',
        'onFileTypeMismatch',
        'onRestrictionFailed',
        'onUploadStart',
        'onFileUploadStart',
        'onFileUploadProgress',
        'onFilesUploadProgress',
        'onFileUploadComplete',
        'onFilesUploadComplete',
        'onUploadComplete',
        'onStatusChange',
        'onFileRemove',
        'onFileRemoved',
        'onFilesDragOver',
        'onFilesDragLeave',
        'onFilesDrop',
        'onError',
        'onWarn',
        'onFileProcessed',
    ]) {
        expect(code).toContain(eventName)
    }
    expect(code).toContain("onError={(...args) => console.log('onError', ...args)}")
    expect(code).toContain("onPrepareFiles={(files, ...args) => { console.log('onPrepareFiles', files, ...args); return files }}")
    expect(code).not.toContain('uploadEndpoint=')
    expect(code).not.toContain('serverUrl=')
    expect(code).not.toContain("locale: 'ar-SA'")
    expect(code).not.toContain("fallbackLocale: 'fr-FR'")
})

test('selects real text and image files, renders file cards, and opens a text preview', async ({ page }, testInfo) => {
    await openPlayground(page)
    await selectFiles(page, [imageFile(), textFile()])

    const items = page.getByTestId('upup-file-item')
    await expect(items).toHaveCount(2)
    await expect(items.filter({ hasText: 'preview-image.png' })).toBeVisible()
    await expect(items.filter({ hasText: 'playground-note.txt' })).toBeVisible()

    const imageThumb = items
        .filter({ hasText: 'preview-image.png' })
        .locator('[data-testid="upup-file-preview"] > div')
        .first()

    await expect.poll(async () => imageThumb.evaluate((el) => getComputedStyle(el).backgroundImage))
        .toContain('blob:')

    await attachScreenshot(page, testInfo, 'selected-text-and-image')

    const textItem = items.filter({ hasText: 'playground-note.txt' })
    const previewButton = textItem.getByRole('button', { name: /click to preview/i })
    await expect(previewButton).toBeVisible()
    await previewButton.click()
    await expect(page.locator('[data-upup-slot="file-preview-portal"]')).toContainText(TEXT_SENTINEL)

    await attachScreenshot(page, testInfo, 'text-preview-portal')
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-upup-slot="file-preview-portal"]')).toHaveCount(0)
})

test('opens every default source panel without runtime errors', async ({ page }, testInfo) => {
    await openPlayground(page)

    const chooserPromise = page.waitForEvent('filechooser')
    await page.getByTestId('upup-source-local').click()
    const chooser = await chooserPromise
    expect(chooser.isMultiple()).toBe(true)
    await chooser.setFiles([])

    const sourcePanels = [
        { id: 'url', assert: () => expect(page.getByTestId('upup-url-uploader')).toBeVisible() },
        { id: 'camera', assert: () => expect(page.getByTestId('upup-camera-uploader')).toBeVisible() },
        { id: 'microphone', assert: () => expect(page.getByRole('button', { name: 'Start Recording' })).toBeVisible() },
        { id: 'screen', assert: () => expect(page.getByRole('button', { name: 'Share Screen' })).toBeVisible() },
    ]

    for (const panel of sourcePanels) {
        await page.getByTestId(`upup-source-${panel.id}`).click()
        await panel.assert()
        await page.getByRole('button', { name: 'Cancel' }).click()
        await expect(page.getByRole('button', { name: 'Cancel' })).toHaveCount(0)
    }

    await attachScreenshot(page, testInfo, 'default-source-panels-verified')
})

test('runtime feature controls affect folder button, accept filter, editor button, and event log', async ({ page }, testInfo) => {
    await openPlayground(page, `?mockRun=${uniqueRun('feature-runtime')}`)

    await openCategory(page, 'Sources')
    await checkSidebarCheckbox(page, 'Sources', 'Allow folders')
    await checkSidebarCheckbox(page, 'Sources', 'Show folder button')
    await expect(page.getByRole('button', { name: /select a folder/i })).toBeVisible()

    await openCategory(page, 'Limits')
    await fillTextField(page, 'Limits', 'Allowed file types', 'images')
    await expect(page.getByTestId('upup-file-input')).toHaveAttribute('accept', 'image/*')

    await openCategory(page, 'Editor')
    await checkSidebarCheckbox(page, 'Editor', 'Enable image editor')
    await selectFiles(page, [imageFile('runtime-editor.png')])
    await expect(page.getByRole('button', { name: /edit image/i })).toBeVisible()
    await attachScreenshot(page, testInfo, 'runtime-editor-button-visible')
})

test('event toggles log selection, removal aliases, prepare-files, and upload lifecycle', async ({ page }, testInfo) => {
    await openPlayground(page, `?mockRun=${uniqueRun('events')}`)

    await openCategory(page, 'Events')
    for (const label of [
        'onFilesSelected',
        'onPrepareFiles',
        'onFileRemove',
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
    await expect(page.getByTestId('upup-root')).toHaveAttribute('data-state', 'successful')

    await page.locator('.upup-ie-tabs').getByRole('button', { name: 'Events' }).click()
    const logList = page.locator('.upup-ie-eventlog-list')
    for (const eventName of [
        'onFilesSelected',
        'onFileRemove',
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

test('runs the checksum pipeline before deterministic mock upload and records upload events', async ({ page }, testInfo) => {
    await openPlayground(page, `?mockRun=${uniqueRun('success')}`)
    await openCategory(page, 'Processing')
    await checkSidebarCheckbox(page, 'Processing', 'Checksum verification (SHA-256)')

    await openCategory(page, 'Events')
    await checkSidebarCheckbox(page, 'Events', 'onFilesSelected')
    await checkSidebarCheckbox(page, 'Events', 'onUploadStart')
    await checkSidebarCheckbox(page, 'Events', 'onFileUploadStart')
    await checkSidebarCheckbox(page, 'Events', 'onFileUploadComplete')
    await checkSidebarCheckbox(page, 'Events', 'onUploadComplete')

    const presignBodies: Array<Record<string, any>> = []
    const presignStatuses: number[] = []
    const putStatuses: number[] = []

    page.on('request', (request) => {
        if (request.method() !== 'POST') return
        if (!request.url().includes('/api/upup-mock/presign')) return
        presignBodies.push(JSON.parse(request.postData() ?? '{}'))
    })

    page.on('response', (response) => {
        const url = response.url()
        if (url.includes('/api/upup-mock/presign')) presignStatuses.push(response.status())
        if (url.includes('/api/upup-mock/object/')) putStatuses.push(response.status())
    })

    await page.route('**/api/upup-mock/object/**', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 350))
        await route.continue()
    })

    await selectFiles(page, [textFile('checksum-pipeline.txt')])
    await attachScreenshot(page, testInfo, 'upload-ready')

    await page.getByTestId('upup-upload-btn').click()
    await expect(page.getByTestId('upup-root')).toHaveAttribute('data-state', 'ongoing')
    await attachScreenshot(page, testInfo, 'upload-in-progress')
    await expect(page.getByTestId('upup-root')).toHaveAttribute('data-state', 'successful')
    await attachScreenshot(page, testInfo, 'upload-success')

    expect(presignStatuses).toEqual([200])
    expect(putStatuses).toEqual([200])
    expect(presignBodies).toHaveLength(1)
    expect(presignBodies[0].metadata?.checksum).toMatch(/^[0-9a-f]{64}$/)

    await page.locator('.upup-ie-tabs').getByRole('button', { name: 'Events' }).click()
    await expect(page.locator('.upup-ie-eventlog-list')).toContainText('onFilesSelected')
    await expect(page.locator('.upup-ie-eventlog-list')).toContainText('onUploadStart')
    await expect(page.locator('.upup-ie-eventlog-list')).toContainText('onFileUploadComplete')
    await expect(page.locator('.upup-ie-eventlog-list')).toContainText('onUploadComplete')
})

test('shows failure state, visible retry control, then succeeds after one mock failure', async ({ page }, testInfo) => {
    await openPlayground(page, `?mockFailure=once&mockRun=${uniqueRun('retry')}`)
    allowExpectedMockFailure.add(page)
    await setNumber(page, 'Max retries', '0')

    const presignStatuses: number[] = []
    const putStatuses: number[] = []
    page.on('response', (response) => {
        const url = response.url()
        if (url.includes('/api/upup-mock/presign')) presignStatuses.push(response.status())
        if (url.includes('/api/upup-mock/object/')) putStatuses.push(response.status())
    })

    await selectFiles(page, [textFile('retry-once.txt')])
    await page.getByTestId('upup-upload-btn').click()
    await expect(page.getByTestId('upup-root')).toHaveAttribute('data-state', 'failed')
    await expect(page.getByTestId('upup-retry-btn')).toBeVisible()
    await attachScreenshot(page, testInfo, 'upload-failed-retry-visible')

    await page.getByTestId('upup-retry-btn').click()
    await expect(page.getByTestId('upup-root')).toHaveAttribute('data-state', 'successful')
    await attachScreenshot(page, testInfo, 'retry-success')

    expect(presignStatuses).toEqual([503, 200])
    expect(putStatuses).toEqual([200])
})

test('applies theme, Arabic RTL locale, and opens the URL source panel without runtime errors', async ({ page }, testInfo) => {
    await openPlayground(page)
    const container = page.getByTestId('upup-container')
    const lightBackground = await container.evaluate((el) => getComputedStyle(el).backgroundColor)

    await openCategory(page, 'Appearance')
    await page.getByRole('radio', { name: 'dark' }).click()
    await expect.poll(async () => container.evaluate((el) => getComputedStyle(el).backgroundColor))
        .not.toBe(lightBackground)

    await openCategory(page, 'Language')
    await category(page, 'Language')
        .getByRole('combobox', { name: /^Locale\b/ })
        .selectOption('ar-SA')
    await expect(page.getByTestId('upup-root')).toHaveAttribute('dir', 'rtl')
    await expect(page.getByTestId('upup-root')).toHaveAttribute('lang', 'ar-SA')
    await expect(page.getByTestId('upup-browse-files')).toContainText('\u062A\u0635\u0641\u062D \u0627\u0644\u0645\u0644\u0641\u0627\u062A')

    await page.getByTestId('upup-source-url').click()
    await expect(page.getByTestId('upup-url-uploader')).toBeVisible()
    await expect(page.locator('input[type="url"]')).toHaveAttribute('placeholder', '\u0623\u062F\u062E\u0644 \u0631\u0627\u0628\u0637 \u0627\u0644\u0645\u0644\u0641')

    await attachScreenshot(page, testInfo, 'dark-rtl-url-source')
})

test('skips duplicate file content when content deduplication is enabled in the playground', async ({ page }, testInfo) => {
    await openPlayground(page)
    await openCategory(page, 'Processing')
    await checkSidebarCheckbox(page, 'Processing', 'Content deduplication')

    const duplicateContent = Buffer.from('same file content from two differently named files')
    await page.getByTestId('upup-file-input').setInputFiles([
        { name: 'duplicate-a.txt', mimeType: 'text/plain', buffer: duplicateContent },
        { name: 'duplicate-b.txt', mimeType: 'text/plain', buffer: duplicateContent },
    ])

    await expect(page.getByTestId('upup-file-list')).toBeVisible()
    await expect(page.getByTestId('upup-file-item')).toHaveCount(1)
    await expect(page.getByTestId('upup-file-list')).toContainText('duplicate-a.txt')
    await attachScreenshot(page, testInfo, 'content-deduplication-single-file')
})

test('rejects invalid runtime selections and logs validation callback payloads', async ({ page }, testInfo) => {
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

    await page.locator('.upup-ie-tabs').getByRole('button', { name: 'Events' }).click()
    const logList = page.locator('.upup-ie-eventlog-list')
    await expect(logList).toContainText('onBeforeFileAdded')
    await expect(logList).toContainText('onFileTypeMismatch')
    await expect(logList).toContainText('onRestrictionFailed')
    await expect(logList).toContainText('TYPE_MISMATCH')
    await expect(logList).toContainText('FILE_TOO_LARGE')
    await expect(logList).toContainText('onError')

    await attachScreenshot(page, testInfo, 'validation-events-type-and-size')
})

test('auto upload, mini mode, preview-off, branding-off, and done reset work together', async ({ page }, testInfo) => {
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
    await expect(page.getByTestId('upup-root')).toHaveAttribute('data-state', 'successful')
    await expect(page.getByRole('button', { name: /click to preview/i })).toHaveCount(0)
    await expect(page.getByTestId('upup-branding')).toHaveCount(0)
    await attachScreenshot(page, testInfo, 'auto-upload-mini-success')

    await page.getByRole('button', { name: 'Done' }).click()
    await expect(page.getByTestId('upup-file-item')).toHaveCount(0)
    await expect(page.getByTestId('upup-root')).toHaveAttribute('data-state', 'pending')

    await page.locator('.upup-ie-tabs').getByRole('button', { name: 'Events' }).click()
    const logList = page.locator('.upup-ie-eventlog-list')
    await expect(logList).toContainText('onUploadStart')
    await expect(logList).toContainText('onUploadComplete')
    await expect(logList).toContainText('onDoneClicked')
    await expect(logList).toContainText('onStatusChange')
    await attachScreenshot(page, testInfo, 'auto-upload-mini-event-log')
})

test('drag/drop and paste flows add real files and report the expected callbacks', async ({ page }, testInfo) => {
    await openPlayground(page)

    await openCategory(page, 'Behavior')
    await checkSidebarCheckbox(page, 'Behavior', 'Enable paste upload')

    await openCategory(page, 'Events')
    for (const label of [
        'onFilesSelected',
        'onFilesDragOver',
        'onFilesDragLeave',
        'onFilesDrop',
    ]) {
        await checkSidebarCheckbox(page, 'Events', label)
    }

    await dispatchDrop(page, textFile('dropped-real-file.txt'))
    await expect(page.getByTestId('upup-file-list')).toBeVisible()
    await expect(page.getByTestId('upup-file-list')).toContainText('dropped-real-file.txt')
    await attachScreenshot(page, testInfo, 'drag-drop-real-file')

    await page.getByTestId('upup-file-remove').click()
    await expect(page.getByTestId('upup-file-item')).toHaveCount(0)

    await dispatchPaste(page, imageFile('clipboard-real-image.png'))
    await expect(page.getByTestId('upup-file-list')).toContainText('clipboard-real-image.png')
    await attachScreenshot(page, testInfo, 'paste-real-image')

    await page.locator('.upup-ie-tabs').getByRole('button', { name: 'Events' }).click()
    const logList = page.locator('.upup-ie-eventlog-list')
    await expect(logList).toContainText('onFilesDragOver')
    await expect(logList).toContainText('onFilesDragLeave')
    await expect(logList).toContainText('onFilesDrop')
    await expect(logList).toContainText('onFilesSelected')
})

test('fetches a real file through the URL source and uploads it through the mock endpoint', async ({ page }, testInfo) => {
    await page.route('**/upup-url-source-image.png', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'image/png',
            body: Buffer.from(RED_PNG_BASE64, 'base64'),
        })
    })
    await openPlayground(page, `?mockRun=${uniqueRun('url-source')}`)

    await openCategory(page, 'Events')
    await checkSidebarCheckbox(page, 'Events', 'onIntegrationClick')
    await checkSidebarCheckbox(page, 'Events', 'onFilesSelected')

    await page.getByTestId('upup-source-url').click()
    await expect(page.getByTestId('upup-url-uploader')).toBeVisible()
    const url = new URL('/upup-url-source-image.png', page.url()).toString()
    await page.locator('input[type="url"]').fill(url)
    await page.getByRole('button', { name: 'Fetch' }).click()

    await expect(page.getByTestId('upup-file-list')).toBeVisible()
    await expect(page.getByTestId('upup-file-item')).toHaveCount(1)
    await expect.poll(async () =>
        page.getByTestId('upup-file-preview').locator('> div').first().evaluate((el) => getComputedStyle(el).backgroundImage),
    ).toContain('blob:')
    await attachScreenshot(page, testInfo, 'url-source-fetched-image')

    await page.getByTestId('upup-upload-btn').click()
    await expect(page.getByTestId('upup-root')).toHaveAttribute('data-state', 'successful')

    await page.locator('.upup-ie-tabs').getByRole('button', { name: 'Events' }).click()
    await expect(page.locator('.upup-ie-eventlog-list')).toContainText('onIntegrationClick')
    await expect(page.locator('.upup-ie-eventlog-list')).toContainText('url')
    await expect(page.locator('.upup-ie-eventlog-list')).toContainText('onFilesSelected')
    await attachScreenshot(page, testInfo, 'url-source-upload-event-log')
})

test('fetches a playground mock-object URL source without request errors', async ({ page }, testInfo) => {
    const objectStatuses: number[] = []
    page.on('response', (response) => {
        if (response.url().includes('/api/upup-mock/object/url-source/')) {
            objectStatuses.push(response.status())
        }
    })

    await openPlayground(page, `?mockRun=${uniqueRun('url-source-mock')}`)

    await page.getByTestId('upup-source-url').click()
    await expect(page.getByTestId('upup-url-uploader')).toBeVisible()
    const url = new URL('/api/upup-mock/object/url-source/source.txt', page.url()).toString()
    await page.locator('input[type="url"]').fill(url)
    await page.getByRole('button', { name: 'Fetch' }).click()

    await expect(page.getByTestId('upup-file-list')).toBeVisible()
    await expect(page.getByTestId('upup-file-list')).toContainText('source.txt')
    await expect.poll(() => objectStatuses).toEqual([200])
    await attachScreenshot(page, testInfo, 'url-source-mock-object-file')
})

test('runs external tus uploads without also keeping the playground presign endpoint', async ({ page }, testInfo) => {
    await openPlayground(page, `?mockRun=${uniqueRun('tus')}`)

    await openCategory(page, 'Upload')
    await clickRadio(page, 'Upload', 'tus')
    await fillTextField(page, 'Upload', 'tus endpoint', '/api/upup-mock/tus')

    const tusStatuses: Array<{ method: string; status: number }> = []
    page.on('response', (response) => {
        const url = response.url()
        if (url.includes('/api/upup-mock/tus')) {
            tusStatuses.push({ method: response.request().method(), status: response.status() })
        }
    })

    await selectFiles(page, [textFile('external-tus.txt')])
    await page.getByTestId('upup-upload-btn').click()
    await expect(page.getByTestId('upup-root')).toHaveAttribute('data-state', 'successful')
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

test('waits for playground SSE processing and logs onFileProcessed after upload', async ({ page }, testInfo) => {
    await openPlayground(page, `?mockRun=${uniqueRun('sse')}`)

    await openCategory(page, 'Advanced')
    await fillTextField(page, 'Advanced', 'Processing endpoint (SSE)', '/api/upup-mock/processing')

    await openCategory(page, 'Events')
    await checkSidebarCheckbox(page, 'Events', 'onFileProcessed')

    await selectFiles(page, [textFile('processing-sse.txt')])
    await page.getByTestId('upup-upload-btn').click()
    await expect(page.getByTestId('upup-root')).toHaveAttribute('data-state', 'successful')

    await page.locator('.upup-ie-tabs').getByRole('button', { name: 'Events' }).click()
    await expect(page.locator('.upup-ie-eventlog-list')).toContainText('onFileProcessed')
    await expect(page.locator('.upup-ie-eventlog-list')).toContainText('processed')
    await attachScreenshot(page, testInfo, 'sse-processing-event-log')
})

test('server-mode cloud drive browser lists, selects, and transfers a mocked file', async ({ page }, testInfo) => {
    const transferBodies: Array<Record<string, unknown>> = []
    await page.route('**/api/upup-server-mock/files/google-drive**', async (route) => {
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
    })

    await openPlayground(page)
    await openCategory(page, 'Advanced')
    await clickRadio(page, 'Advanced', 'server')
    await fillTextField(page, 'Advanced', 'Server URL', '/api/upup-server-mock')
    await fillNestedTextField(page, 'Advanced', 'Google Drive', 'Client ID', 'fake-google-client')

    await openCategory(page, 'Sources')
    await ensureSourceTile(page, 'Google Drive')
    await page.getByTestId('upup-source-googleDrive').click()

    await expect(page.getByTestId('upup-server-drive-browser')).toBeVisible()
    await expect(page.getByTestId('upup-server-drive-browser')).toContainText('quarterly-report.pdf')
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
    await attachScreenshot(page, testInfo, 'server-mode-google-drive-transfer-complete')
})

test('theme slot overrides are reflected in the live uploader DOM', async ({ page }, testInfo) => {
    await openPlayground(page)

    await openCategory(page, 'Appearance')
    await fillNestedTextField(page, 'Appearance', 'Slot overrides (className strings)', 'uploader.container', 'e2e-uploader-container')
    await fillNestedTextField(page, 'Appearance', 'Slot overrides (className strings)', 'fileList.uploadButton', 'e2e-upload-button')
    await fillNestedTextField(page, 'Appearance', 'Slot overrides (className strings)', 'progressBar.fill', 'e2e-progress-fill')
    await fillNestedTextField(page, 'Appearance', 'Slot overrides (className strings)', 'urlUploader.fetchButton', 'e2e-url-fetch')

    await expect(page.getByTestId('upup-container')).toHaveClass(/e2e-uploader-container/)
    await page.getByTestId('upup-source-url').click()
    await expect(page.getByTestId('upup-url-uploader').getByRole('button', { name: 'Fetch' })).toHaveClass(/e2e-url-fetch/)
    await page.getByRole('button', { name: 'Cancel' }).click()

    await selectFiles(page, [textFile('themed-file.txt')])
    await expect(page.getByTestId('upup-upload-btn')).toHaveClass(/e2e-upload-button/)
    await page.getByTestId('upup-upload-btn').click()
    await expect(page.getByTestId('upup-root')).toHaveAttribute('data-state', 'successful')
    await expect(page.locator('.e2e-progress-fill')).toHaveCount(2)
    await attachScreenshot(page, testInfo, 'theme-slot-overrides-live-dom')
})

test('modal image editor lazy-loads and can be dismissed after auto-open', async ({ page }, testInfo) => {
    await openPlayground(page)

    await openCategory(page, 'Editor')
    await checkSidebarCheckbox(page, 'Editor', 'Enable image editor')
    await clickRadio(page, 'Editor', 'modal')
    await clickRadio(page, 'Editor', 'When 1 image is added')

    await trySelectFiles(page, [imageFile('editor-modal.png')])
    const dialog = page.getByRole('dialog', { name: /Edit image: editor-modal\.png/ })
    await expect(dialog).toBeVisible({ timeout: 30_000 })
    await attachScreenshot(page, testInfo, 'image-editor-modal-open')

    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
})

test('camera and microphone capture flows create real queued files with fake browser devices', async ({ page }, testInfo) => {
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
    await expect(page.getByRole('button', { name: 'Stop Recording' })).toBeVisible()
    await page.waitForTimeout(500)
    await page.getByRole('button', { name: 'Stop Recording' }).click()
    await expect(page.getByRole('button', { name: 'Add Recording' })).toBeVisible()
    await page.getByRole('button', { name: 'Add Recording' }).click()
    await expect(page.getByTestId('upup-file-item')).toHaveCount(1)
    await expect(page.getByTestId('upup-file-list')).toContainText(/recording-\d+\.(webm|ogg)/)
    await attachScreenshot(page, testInfo, 'microphone-recording-added-file')
})

test.describe('mobile playground acceptance', () => {
    test.use({ viewport: { width: 390, height: 844 } })

    test('selects and uploads a local file without horizontal overflow or clipped controls', async ({ page }, testInfo) => {
        await openPlayground(page, `?mockRun=${uniqueRun('mobile')}`)
        await page.locator('.upup-ie-main').scrollIntoViewIfNeeded()
        await selectFiles(page, [textFile('mobile-upload.txt')])

        await page.getByTestId('upup-upload-btn').scrollIntoViewIfNeeded()
        await page.getByTestId('upup-upload-btn').click()
        await expect(page.getByTestId('upup-root')).toHaveAttribute('data-state', 'successful')

        const horizontalOverflow = await page.evaluate(() =>
            Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth,
        )
        expect(horizontalOverflow).toBeLessThanOrEqual(2)

        await attachScreenshot(page, testInfo, 'mobile-upload-success', true)
    })
})
