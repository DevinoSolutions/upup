import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { expect, test } from '@playwright/test'

import {
    registerBrowserIssueGuards,
    allowExpectedResourceFailure,
    RED_PNG_BASE64,
    textFile,
    imageFile,
    uniqueRun,
    openPlayground,
    openCategory,
    checkSidebarCheckbox,
    getGeneratedCode,
    attachScreenshot,
    selectFiles,
    dispatchDrop,
    dispatchPaste,
} from './playground-deep-helpers'

registerBrowserIssueGuards()

test('drag/drop and paste flows add real files and report the expected callbacks', async ({
    page,
}, testInfo) => {
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
    await expect(page.getByTestId('upup-file-list')).toContainText(
        'dropped-real-file.txt',
    )
    await attachScreenshot(page, testInfo, 'drag-drop-real-file')

    await page.getByTestId('upup-file-remove').click()
    await expect(page.getByTestId('upup-file-item')).toHaveCount(0)

    await dispatchPaste(page, imageFile('clipboard-real-image.png'))
    await expect(page.getByTestId('upup-file-list')).toContainText(
        'clipboard-real-image.png',
    )
    await attachScreenshot(page, testInfo, 'paste-real-image')

    await page
        .locator('.upup-ie-tabs')
        .getByRole('button', { name: 'Events' })
        .click()
    const logList = page.locator('.upup-ie-eventlog-list')
    await expect(logList).toContainText('onFilesDragOver')
    await expect(logList).toContainText('onFilesDragLeave')
    await expect(logList).toContainText('onFilesDrop')
    await expect(logList).toContainText('onFilesSelected')
})

test('folder drop and Select Folder button controls are configured independently', async ({
    page,
}, testInfo) => {
    await openPlayground(page, `?mockRun=${uniqueRun('folder-controls')}`)
    await openCategory(page, 'Sources')

    await checkSidebarCheckbox(page, 'Sources', 'Allow folder drag/drop')
    await expect(
        page.getByRole('button', { name: /select a folder/i }),
    ).toHaveCount(0)

    let code = await getGeneratedCode(page)
    expect(code).toContain('folderUpload={{')
    expect(code).toContain('allowDrop: true')
    expect(code).not.toContain('showSelectFolderButton: true')

    await page
        .locator('.upup-ie-tabs')
        .getByRole('button', { name: 'Preview' })
        .click()
    await checkSidebarCheckbox(page, 'Sources', 'Show Select Folder button')
    await expect(
        page.getByRole('button', { name: /select a folder/i }),
    ).toBeVisible()
    code = await getGeneratedCode(page)
    expect(code).toContain('allowDrop: true')
    expect(code).toContain('showSelectFolderButton: true')
    await attachScreenshot(page, testInfo, 'folder-controls-independent')
})

test('Select Folder button queues files from the browser directory picker', async ({
    page,
}, testInfo) => {
    await page.addInitScript(() => {
        const fileHandle = (name: string, contents: string) => ({
            kind: 'file',
            name,
            getFile: async () =>
                new File([contents], name, { type: 'text/plain' }),
        })
        const nestedDirectory = {
            kind: 'directory',
            name: 'nested',
            values: async function* () {
                yield fileHandle('nested-picked.txt', 'nested')
            },
        }
        Object.defineProperty(window, 'showDirectoryPicker', {
            configurable: true,
            value: async () => ({
                values: async function* () {
                    yield fileHandle('root-picked.txt', 'root')
                    yield nestedDirectory
                },
            }),
        })
    })

    await openPlayground(page, `?mockRun=${uniqueRun('select-folder')}`)
    await openCategory(page, 'Sources')
    await checkSidebarCheckbox(page, 'Sources', 'Show Select Folder button')
    await expect(
        page.getByRole('button', { name: /select a folder/i }),
    ).toBeVisible()

    let code = await getGeneratedCode(page)
    expect(code).toContain('showSelectFolderButton: true')
    expect(code).not.toContain('allowDrop: true')
    expect(code).not.toContain('showPickerButton')

    await page
        .locator('.upup-ie-tabs')
        .getByRole('button', { name: 'Preview' })
        .click()
    await page.getByRole('button', { name: /select a folder/i }).click()
    await expect(page.getByTestId('upup-file-item')).toHaveCount(2)
    await expect(page.getByText('root-picked.txt')).toBeVisible()
    await expect(page.getByText('nested-picked.txt')).toBeVisible()
    await attachScreenshot(page, testInfo, 'select-folder-button-picked-files')
})

test('folder upload preserves relative paths in upload metadata', async ({
    page,
}, testInfo) => {
    const folderRoot = testInfo.outputPath('folder-fixture')
    mkdirSync(join(folderRoot, 'photos', '2026'), { recursive: true })
    mkdirSync(join(folderRoot, 'docs'), { recursive: true })
    writeFileSync(join(folderRoot, 'photos', '2026', 'a.txt'), 'A')
    writeFileSync(join(folderRoot, 'photos', '2026', 'b.txt'), 'B')
    writeFileSync(join(folderRoot, 'docs', 'readme.txt'), 'Readme')

    const presignBodies: Array<Record<string, any>> = []
    page.on('request', request => {
        if (request.method() !== 'POST') return
        if (!request.url().includes('/api/upup-mock/presign')) return
        presignBodies.push(JSON.parse(request.postData() ?? '{}'))
    })

    await openPlayground(page, `?mockRun=${uniqueRun('folder-paths')}`)
    await openCategory(page, 'Sources')
    await checkSidebarCheckbox(page, 'Sources', 'Allow folder drag/drop')
    await checkSidebarCheckbox(page, 'Sources', 'Show Select Folder button')
    await expect(
        page.getByRole('button', { name: /select a folder/i }),
    ).toBeVisible()

    await page.getByTestId('upup-file-input').evaluate(input => {
        const fileInput = input as HTMLInputElement
        fileInput.setAttribute('webkitdirectory', 'true')
        fileInput.setAttribute('directory', 'true')
    })
    await page.getByTestId('upup-file-input').setInputFiles(folderRoot)

    await expect(page.getByTestId('upup-file-item')).toHaveCount(3)
    await attachScreenshot(page, testInfo, 'folder-upload-files-selected')

    await page.getByTestId('upup-upload-btn').click()
    await expect(page.getByTestId('upup-root')).toHaveAttribute(
        'data-state',
        'successful',
    )

    const relativePaths = presignBodies
        .map(body => String(body.metadata?.relativePath ?? ''))
        .filter(Boolean)
        .sort()
    expect(relativePaths).toHaveLength(3)
    expect(relativePaths.some(path => path.endsWith('docs/readme.txt'))).toBe(
        true,
    )
    expect(relativePaths.some(path => path.endsWith('photos/2026/a.txt'))).toBe(
        true,
    )
    expect(relativePaths.some(path => path.endsWith('photos/2026/b.txt'))).toBe(
        true,
    )
    await attachScreenshot(page, testInfo, 'folder-upload-success')
})

test('disable drag and drop ignores dropped files while browse remains usable', async ({
    page,
}, testInfo) => {
    await openPlayground(page)
    await openCategory(page, 'Behavior')
    await checkSidebarCheckbox(page, 'Behavior', 'Disable drag and drop')

    await dispatchDrop(page, textFile('ignored-dragged-file.txt'))
    await expect(page.getByTestId('upup-file-item')).toHaveCount(0)

    await selectFiles(page, [textFile('browse-still-works.txt')])
    await expect(page.getByTestId('upup-file-list')).toContainText(
        'browse-still-works.txt',
    )
    await attachScreenshot(
        page,
        testInfo,
        'disable-drag-drop-browse-still-works',
    )
})

test('fetches a real file through the URL source and uploads it through the mock endpoint', async ({
    page,
}, testInfo) => {
    await page.route('**/upup-url-source-image.png', async route => {
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
    await expect
        .poll(async () =>
            page
                .getByTestId('upup-file-preview')
                .locator('> div')
                .first()
                .evaluate(el => getComputedStyle(el).backgroundImage),
        )
        .toContain('blob:')
    await attachScreenshot(page, testInfo, 'url-source-fetched-image')

    await page.getByTestId('upup-upload-btn').click()
    await expect(page.getByTestId('upup-root')).toHaveAttribute(
        'data-state',
        'successful',
    )

    await page
        .locator('.upup-ie-tabs')
        .getByRole('button', { name: 'Events' })
        .click()
    await expect(page.locator('.upup-ie-eventlog-list')).toContainText(
        'onIntegrationClick',
    )
    await expect(page.locator('.upup-ie-eventlog-list')).toContainText('url')
    await expect(page.locator('.upup-ie-eventlog-list')).toContainText(
        'onFilesSelected',
    )
    await attachScreenshot(page, testInfo, 'url-source-upload-event-log')
})

test('fetches a playground mock-object URL source without request errors', async ({
    page,
}, testInfo) => {
    const objectStatuses: number[] = []
    page.on('response', response => {
        if (response.url().includes('/api/upup-mock/object/url-source/')) {
            objectStatuses.push(response.status())
        }
    })

    await openPlayground(page, `?mockRun=${uniqueRun('url-source-mock')}`)

    await page.getByTestId('upup-source-url').click()
    await expect(page.getByTestId('upup-url-uploader')).toBeVisible()
    const url = new URL(
        '/api/upup-mock/object/url-source/source.txt',
        page.url(),
    ).toString()
    await page.locator('input[type="url"]').fill(url)
    await page.getByRole('button', { name: 'Fetch' }).click()

    await expect(page.getByTestId('upup-file-list')).toBeVisible()
    await expect(page.getByTestId('upup-file-list')).toContainText('source.txt')
    await expect.poll(() => objectStatuses).toEqual([200])
    await attachScreenshot(page, testInfo, 'url-source-mock-object-file')
})

test('URL source surfaces fetch errors and safely derives fallback filenames', async ({
    page,
}, testInfo) => {
    allowExpectedResourceFailure.add(page)
    await page.route('**/url-source-404.txt', async route => {
        await route.fulfill({
            status: 404,
            contentType: 'text/plain',
            body: 'missing',
        })
    })
    await page.route('**/url-source-no-content-type', async route => {
        await route.fulfill({
            status: 200,
            headers: {},
            body: 'no content type',
        })
    })
    await page.route('**/url-source-disposition', async route => {
        await route.fulfill({
            status: 200,
            headers: {
                'content-type': 'text/plain',
                'content-disposition': 'attachment; filename="bad<name?.txt"',
            },
            body: 'safe filename',
        })
    })

    await openPlayground(page)
    await openCategory(page, 'Events')
    await checkSidebarCheckbox(page, 'Events', 'onError')

    await page.getByTestId('upup-source-url').click()
    await expect(page.getByTestId('upup-url-uploader')).toBeVisible()
    await page
        .locator('input[type="url"]')
        .fill(new URL('/url-source-404.txt', page.url()).toString())
    await page.getByRole('button', { name: 'Fetch' }).click()
    await expect(page.getByTestId('upup-file-item')).toHaveCount(0)
    await page
        .locator('.upup-ie-tabs')
        .getByRole('button', { name: 'Events' })
        .click()
    await expect(page.locator('.upup-ie-eventlog-list')).toContainText(
        'onError',
    )
    await expect(page.locator('.upup-ie-eventlog-list')).toContainText(
        'Failed to fetch URL: 404',
    )
    await attachScreenshot(page, testInfo, 'url-source-404-error-log')

    await page
        .locator('.upup-ie-tabs')
        .getByRole('button', { name: 'Preview' })
        .click()
    if ((await page.locator('input[type="url"]').count()) === 0) {
        await page.getByTestId('upup-source-url').click()
    }
    await page
        .locator('input[type="url"]')
        .fill(new URL('/url-source-no-content-type', page.url()).toString())
    await page.getByRole('button', { name: 'Fetch' }).click()
    await expect(page.getByTestId('upup-file-list')).toContainText(
        'url-source-no-content-type',
    )

    await page.getByTestId('upup-file-remove').click()
    await expect(page.getByTestId('upup-file-item')).toHaveCount(0)
    await page.getByTestId('upup-source-url').click()
    await page
        .locator('input[type="url"]')
        .fill(new URL('/url-source-disposition', page.url()).toString())
    await page.getByRole('button', { name: 'Fetch' }).click()
    await expect(page.getByTestId('upup-file-list')).toContainText(
        'bad_name_.txt',
    )
    await expect(page.getByTestId('upup-file-list')).not.toContainText('<')
    await expect(page.getByTestId('upup-file-list')).not.toContainText('?')
    await attachScreenshot(page, testInfo, 'url-source-safe-filenames')
})
