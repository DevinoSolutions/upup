import { expect, test } from '@playwright/test'

import {
    registerBrowserIssueGuards,
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
    clickRadio,
    selectOption,
    setSizeUnit,
    setRangeField,
    fillColorField,
    ensureSourceTile,
    getGeneratedCode,
    attachScreenshot,
    selectFiles,
} from './playground-deep-helpers'

registerBrowserIssueGuards()

test('renders the real playground shell, uploader, source controls, and generated code', async ({
    page,
}, testInfo) => {
    await openPlayground(page)

    await expect(page.getByRole('tab', { name: 'Advanced' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Preview' })).toHaveClass(
        /is-active/,
    )
    await expect(page.getByTestId('upup-source-local')).toBeVisible()
    await expect(page.getByTestId('upup-source-url')).toBeVisible()
    await expect(page.getByTestId('upup-container')).toBeVisible()

    await page
        .locator('.upup-ie-tabs')
        .getByRole('button', { name: 'Code' })
        .click()
    await expect(page.locator('.upup-ie-code-pre')).toContainText(
        "import { UpupUploader } from '@useupup/react'",
    )
    await expect(page.locator('.upup-ie-code-pre')).toContainText(
        'uploadEndpoint=',
    )

    await attachScreenshot(page, testInfo, 'desktop-shell-code')
})

test('defaults the playground and uploader controls to system theme', async ({
    page,
}, testInfo) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.addInitScript(() => {
        window.localStorage.removeItem('theme')
        window.localStorage.setItem('upup-ie:sidebar-tier', 'advanced')
    })

    await page.goto('/')
    await expect(
        page.getByRole('heading', { name: 'Upup Playground' }),
    ).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'system')
    await expect(page.locator('html')).toHaveClass(/dark/)

    await openCategory(page, 'Appearance')
    await expect(
        category(page, 'Appearance')
            .getByRole('radio', { name: /system/i })
            .first(),
    ).toHaveAttribute('aria-checked', 'true')
    await expect
        .poll(() => page.evaluate(() => window.localStorage.getItem('theme')))
        .toBeNull()

    await page
        .locator('.upup-ie-tabs')
        .getByRole('button', { name: 'Code' })
        .click()
    const code = await getGeneratedCode(page)
    expect(code).not.toContain("mode: 'system'")
    await attachScreenshot(page, testInfo, 'system-theme-default', true)
})

test('assistant canned prompts apply deterministic local patches without Mastra', async ({
    page,
}, testInfo) => {
    await openPlayground(page, `?mockRun=${uniqueRun('assistant-fallback')}`)

    await page
        .getByRole('button', { name: 'Add Google Drive and Dropbox' })
        .click()

    await expect(
        page.getByRole('button', { name: 'Google Drive' }).last(),
    ).toBeVisible()
    await expect(
        page.getByRole('button', { name: 'Dropbox' }).last(),
    ).toBeVisible()
    await expect(page.getByText('Applied:')).toBeVisible()
    await expect(
        page.getByText('Enabled Google Drive and Dropbox sources.').last(),
    ).toBeVisible()

    const code = await getGeneratedCode(page)
    expect(code).toContain('sources={[')
    expect(code).toContain("'googleDrive'")
    expect(code).toContain("'dropbox'")
    await attachScreenshot(page, testInfo, 'assistant-local-fallback', true)
})

test('defaults keep optional integrations out of the live uploader until explicitly enabled', async ({
    page,
}, testInfo) => {
    await openPlayground(page)

    for (const id of ['local', 'url', 'camera', 'microphone', 'screen']) {
        await expect(page.getByTestId(`upup-source-${id}`)).toBeVisible()
    }
    for (const id of ['googleDrive', 'oneDrive', 'dropbox', 'box']) {
        await expect(page.getByTestId(`upup-source-${id}`)).toHaveCount(0)
    }
    await expect(
        page.getByRole('button', { name: /select a folder/i }),
    ).toHaveCount(0)

    await selectFiles(page, [imageFile('editor-default-off.png')])
    await expect(page.getByRole('button', { name: /edit image/i })).toHaveCount(
        0,
    )
    await attachScreenshot(page, testInfo, 'default-optional-integrations-off')
})

test('wires every playground category into copy-pasteable generated code', async ({
    page,
}, testInfo) => {
    await openPlayground(page)

    await openCategory(page, 'Upload')
    await clickRadio(page, 'Upload', 'backblaze')
    await setNumber(page, 'Max concurrent uploads', '5')
    await setNumber(page, 'Max retries', '2')
    await checkSidebarCheckbox(page, 'Upload', 'Auto upload')
    await checkSidebarCheckbox(page, 'Upload', 'Crash recovery (IndexedDB)')
    await clickRadio(page, 'Upload', 'tus')
    await setSizeUnit(page, 'Upload', 'Chunk size', '6', 'MB')
    await fillTextField(
        page,
        'Upload',
        'tus endpoint',
        'https://tus.example.com/files',
    )

    await openCategory(page, 'Advanced')
    await clickRadio(page, 'Advanced', 'server')
    await fillTextField(page, 'Advanced', 'Server URL', '/api/upup')
    await fillTextField(
        page,
        'Advanced',
        'Processing endpoint (SSE)',
        '/api/processing/status',
    )
    await setNumber(page, 'Processing timeout (ms)', '120000')
    await checkSidebarCheckbox(page, 'Advanced', 'Dangerously auto-configure')
    await fillNestedTextField(
        page,
        'Advanced',
        'CORS',
        'Allowed origins',
        'http://localhost:3000, https://example.com',
    )
    await fillNestedTextField(
        page,
        'Advanced',
        'Google Drive',
        'Client ID',
        'gd-client',
    )
    await fillNestedTextField(
        page,
        'Advanced',
        'Google Drive',
        'API Key',
        'gd-key',
    )
    await fillNestedTextField(
        page,
        'Advanced',
        'Google Drive',
        'App ID',
        'gd-app',
    )
    await fillNestedTextField(
        page,
        'Advanced',
        'OneDrive',
        'Client ID',
        'od-client',
    )
    await fillNestedTextField(
        page,
        'Advanced',
        'Dropbox',
        'Client ID',
        'dbx-client',
    )
    await fillNestedTextField(
        page,
        'Advanced',
        'Box',
        'Client ID',
        'box-client',
    )

    await openCategory(page, 'Sources')
    for (const label of ['Google Drive', 'OneDrive', 'Dropbox', 'Box']) {
        await ensureSourceTile(page, label)
    }
    await checkSidebarCheckbox(page, 'Sources', 'Allow folder drag/drop')
    await checkSidebarCheckbox(page, 'Sources', 'Show Select Folder button')

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
    await fillNestedTextField(
        page,
        'Appearance',
        'Slot overrides (className strings)',
        'uploader.container',
        'ring-4 ring-pink-500',
    )
    await fillNestedTextField(
        page,
        'Appearance',
        'Slot overrides (className strings)',
        'fileList.root',
        'bg-slate-50',
    )
    await fillNestedTextField(
        page,
        'Appearance',
        'Slot overrides (className strings)',
        'fileList.uploadButton',
        'bg-emerald-600 text-white',
    )
    await fillNestedTextField(
        page,
        'Appearance',
        'Slot overrides (className strings)',
        'filePreview.deleteButton',
        'bg-red-500 text-white',
    )
    await fillNestedTextField(
        page,
        'Appearance',
        'Slot overrides (className strings)',
        'progressBar.fill',
        'bg-pink-500',
    )
    await fillNestedTextField(
        page,
        'Appearance',
        'Slot overrides (className strings)',
        'sourceSelector.sourceButton',
        'rounded-md border',
    )
    await fillNestedTextField(
        page,
        'Appearance',
        'Slot overrides (className strings)',
        'sourceView.header',
        'border-b px-4',
    )
    await fillNestedTextField(
        page,
        'Appearance',
        'Slot overrides (className strings)',
        'urlUploader.fetchButton',
        'bg-slate-900 text-white',
    )
    await fillTextField(page, 'Appearance', 'Root className', 'max-w-xl')

    await openCategory(page, 'Language')
    await selectOption(page, 'Language', 'Locale', 'ar-SA')
    await selectOption(page, 'Language', 'Fallback locale', 'fr-FR')
    await fillNestedTextField(
        page,
        'Language',
        'Message overrides (visible labels)',
        'fileList.uploadFiles',
        'Send now',
    )
    await fillNestedTextField(
        page,
        'Language',
        'Message overrides (visible labels)',
        'common.cancel',
        'Stop',
    )
    await fillNestedTextField(
        page,
        'Language',
        'Message overrides (visible labels)',
        'dropzone.browseFiles',
        'Add files',
    )
    await fillNestedTextField(
        page,
        'Language',
        'Message overrides (visible labels)',
        'header.filesSelected',
        '{count, plural, one {# ready} other {# ready}}',
    )

    await openCategory(page, 'Events')
    for (const checkbox of await category(page, 'Events')
        .getByRole('checkbox')
        .all()) {
        await checkbox.check()
    }

    const code = await getGeneratedCode(page)
    await attachScreenshot(
        page,
        testInfo,
        'feature-matrix-generated-code',
        true,
    )

    for (const text of [
        "import { arSA, frFR } from '@useupup/core'",
        'provider="backblaze"',
        'maxConcurrentUploads={5}',
        'maxRetries={2}',
        'autoUpload',
        'crashRecovery',
        "protocol: 'tus'",
        'chunkSizeBytes: 6291456',
        "endpoint: 'https://tus.example.com/files'",
        'processingEndpoint="/api/processing/status"',
        'processingTimeout={120000}',
        'dangerouslyAutoConfigure: true',
        'allowedOrigins: [',
        "'http://localhost:3000'",
        "'https://example.com'",
        'folderUpload={{',
        'allowDrop: true',
        'showSelectFolderButton: true',
        'allowedFileTypes="images"',
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
        "primary: '#ff0066'",
        'className="max-w-xl"',
        'locale: arSA',
        'fallbackLocale: frFR',
        'fileList: {',
        "uploadFiles: 'Send now'",
        'dropzone: {',
        "browseFiles: 'Add files'",
        "filesSelected: '{count, plural, one {# ready} other {# ready}}'",
        'cloudDrives={{',
        "clientId: 'gd-client'",
        "apiKey: 'gd-key'",
        "appId: 'gd-app'",
        "clientId: 'od-client'",
        "clientId: 'dbx-client'",
        "clientId: 'box-client'",
    ]) {
        expect(code).toContain(text)
    }

    for (const source of [
        'local',
        'url',
        'camera',
        'microphone',
        'screen',
        'googleDrive',
        'oneDrive',
        'dropbox',
        'box',
    ]) {
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
    expect(code).toContain(
        "onError={(...args) => console.log('onError', ...args)}",
    )
    expect(code).toContain(
        "onPrepareFiles={(files, ...args) => { console.log('onPrepareFiles', files, ...args); return files }}",
    )
    expect(code).not.toContain('uploadEndpoint=')
    expect(code).not.toContain('serverUrl=')
    expect(code).not.toContain("locale: 'ar-SA'")
    expect(code).not.toContain("fallbackLocale: 'fr-FR'")
    for (const forbidden of [
        'upup-react-file-uploader',
        '@useupup/shared',
        'ProviderSDK',
        'FileWithParams',
        'UploadAdapter',
        'uploadAdapters',
        'driveConfigs',
        'localePack',
        'translations=',
        'classNames',
        'dark=',
        'tokenEndpoint',
        'syncFilesFromExternal',
        'syncStatusFromExternal',
    ]) {
        expect(code).not.toContain(forbidden)
    }
})
