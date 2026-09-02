import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import {
    expect,
    test,
    type Locator,
    type Page,
    type TestInfo,
} from '@playwright/test'

type BrowserIssue = {
    source: 'console' | 'pageerror' | 'requestfailed'
    text: string
}

const browserIssues = new WeakMap<Page, BrowserIssue[]>()
const allowExpectedMockFailure = new WeakSet<Page>()
const allowExpectedResourceFailure = new WeakSet<Page>()

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

function largeTextFile(name = 'large-playground-note.txt', bytes = 512 * 1024) {
    const chunk = `${TEXT_CONTENT}\n`
    const repeats = Math.ceil(bytes / Buffer.byteLength(chunk))
    return {
        name,
        mimeType: 'text/plain',
        buffer: Buffer.from(chunk.repeat(repeats).slice(0, bytes)),
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

function generatedFile(name: string, bytes: number, mimeType = 'text/plain') {
    const chunk = Buffer.from(`Upup generated fixture for ${name}\n`)
    const chunks: Buffer[] = []
    let remaining = bytes
    while (remaining > 0) {
        const next = chunk.subarray(0, Math.min(chunk.length, remaining))
        chunks.push(next)
        remaining -= next.length
    }
    return {
        name,
        mimeType,
        buffer: Buffer.concat(chunks),
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
    await expect(
        page.getByRole('heading', { name: 'Upup Playground' }),
    ).toBeVisible()
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

async function checkSidebarCheckbox(
    page: Page,
    categoryLabel: string,
    label: string,
): Promise<void> {
    await category(page, categoryLabel)
        .getByRole('checkbox', {
            name: new RegExp(`^${escapeRegExp(label)}(?:\\s|$)`),
        })
        .check()
}

async function uncheckSidebarCheckbox(
    page: Page,
    categoryLabel: string,
    label: string,
): Promise<void> {
    await category(page, categoryLabel)
        .getByRole('checkbox', {
            name: new RegExp(`^${escapeRegExp(label)}(?:\\s|$)`),
        })
        .uncheck()
}

async function setNumber(
    page: Page,
    label: string,
    value: string,
): Promise<void> {
    const input = labelledField(page, page.locator('body'), label)
        .locator('input[type="number"]')
        .first()
    await input.fill(value)
    await input.blur()
}

function labelledField(page: Page, scope: Locator, label: string): Locator {
    return scope
        .locator('.upup-ie-field')
        .filter({
            has: page.locator('.upup-ie-field-label', {
                hasText: new RegExp(`^${escapeRegExp(label)}$`),
            }),
        })
        .first()
}

function nestedFieldset(
    page: Page,
    categoryLabel: string,
    legend: string,
): Locator {
    return category(page, categoryLabel)
        .locator('fieldset.upup-ie-nested')
        .filter({
            has: page.locator('legend', {
                hasText: new RegExp(`^${escapeRegExp(legend)}$`),
            }),
        })
        .first()
}

async function fillTextField(
    page: Page,
    categoryLabel: string,
    label: string,
    value: string,
): Promise<void> {
    const field = labelledField(page, category(page, categoryLabel), label)
    await field
        .locator('input[type="text"], input:not([type])')
        .first()
        .fill(value)
}

async function fillNestedTextField(
    page: Page,
    categoryLabel: string,
    legend: string,
    label: string,
    value: string,
): Promise<void> {
    const field = labelledField(
        page,
        nestedFieldset(page, categoryLabel, legend),
        label,
    )
    await field
        .locator('input[type="text"], input:not([type])')
        .first()
        .fill(value)
}

async function clickRadio(
    page: Page,
    categoryLabel: string,
    label: string,
): Promise<void> {
    const radio = category(page, categoryLabel)
        .getByRole('radio', { name: new RegExp(escapeRegExp(label), 'i') })
        .first()
    if ((await radio.getAttribute('aria-checked')) !== 'true') {
        await radio.click()
    }
}

async function selectOption(
    page: Page,
    categoryLabel: string,
    label: string,
    value: string,
): Promise<void> {
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

async function setRangeField(
    page: Page,
    categoryLabel: string,
    label: string,
    value: string,
): Promise<void> {
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

async function fillColorField(
    page: Page,
    categoryLabel: string,
    label: string,
    value: string,
): Promise<void> {
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
    await page
        .locator('.upup-ie-tabs')
        .getByRole('button', { name: 'Code' })
        .click()
    const code = await page.locator('.upup-ie-code-pre').textContent()
    return code ?? ''
}

async function attachScreenshot(
    page: Page,
    testInfo: TestInfo,
    name: string,
    fullPage = false,
): Promise<void> {
    const path = testInfo.outputPath(`${name}.png`)
    await page.screenshot({ path, fullPage })
    await testInfo.attach(name, { path, contentType: 'image/png' })
}

async function readCrashRecoverySnapshot(page: Page): Promise<any> {
    return page.evaluate(
        () =>
            new Promise(resolve => {
                const request = indexedDB.open('upup-crash-recovery', 1)
                request.onerror = () => resolve(null)
                request.onupgradeneeded = () => {
                    request.result.createObjectStore('upup-store')
                }
                request.onsuccess = () => {
                    const db = request.result
                    const tx = db.transaction('upup-store', 'readonly')
                    const store = tx.objectStore('upup-store')
                    const getRequest = store.get('upup-crash-recovery')
                    getRequest.onerror = () => {
                        db.close()
                        resolve(null)
                    }
                    getRequest.onsuccess = () => {
                        const result = getRequest.result ?? null
                        tx.oncomplete = () => db.close()
                        tx.onerror = () => db.close()
                        resolve(result)
                    }
                }
            }),
    )
}

async function clearCrashRecoverySnapshot(page: Page): Promise<void> {
    await page.evaluate(
        () =>
            new Promise<void>(resolve => {
                const request = indexedDB.open('upup-crash-recovery', 1)
                request.onerror = () => resolve()
                request.onupgradeneeded = () => {
                    request.result.createObjectStore('upup-store')
                }
                request.onsuccess = () => {
                    const db = request.result
                    const tx = db.transaction('upup-store', 'readwrite')
                    tx.objectStore('upup-store').delete('upup-crash-recovery')
                    tx.oncomplete = () => {
                        db.close()
                        resolve()
                    }
                    tx.onerror = () => {
                        db.close()
                        resolve()
                    }
                }
            }),
    )
}

async function selectFiles(
    page: Page,
    files: ReturnType<typeof textFile>[],
): Promise<void> {
    await page.getByTestId('upup-file-input').setInputFiles(files)
    await expect(page.getByTestId('upup-file-list')).toBeVisible()
}

async function trySelectFiles(
    page: Page,
    files: ReturnType<typeof textFile>[],
): Promise<void> {
    await page.getByTestId('upup-file-input').setInputFiles(files)
}

async function dispatchDrop(
    page: Page,
    file: ReturnType<typeof textFile>,
): Promise<void> {
    const dataTransfer = await page.evaluateHandle(
        ({ name, mimeType, bytes }) => {
            const dt = new DataTransfer()
            dt.items.add(
                new File([new Uint8Array(bytes)], name, { type: mimeType }),
            )
            return dt
        },
        {
            name: file.name,
            mimeType: file.mimeType,
            bytes: [...file.buffer],
        },
    )
    await page
        .getByTestId('upup-dropzone')
        .dispatchEvent('dragover', { dataTransfer })
    await page
        .getByTestId('upup-dropzone')
        .dispatchEvent('dragleave', { dataTransfer })
    await page
        .getByTestId('upup-dropzone')
        .dispatchEvent('dragover', { dataTransfer })
    await page
        .getByTestId('upup-dropzone')
        .dispatchEvent('drop', { dataTransfer })
}

async function dispatchPaste(
    page: Page,
    file: ReturnType<typeof imageFile>,
): Promise<void> {
    await page.getByTestId('upup-dropzone').evaluate(
        (el, payload) => {
            const dt = new DataTransfer()
            dt.items.add(
                new File([new Uint8Array(payload.bytes)], payload.name, {
                    type: payload.mimeType,
                }),
            )
            const event = new ClipboardEvent('paste', {
                bubbles: true,
                cancelable: true,
            })
            Object.defineProperty(event, 'clipboardData', { value: dt })
            el.dispatchEvent(event)
        },
        {
            name: file.name,
            mimeType: file.mimeType,
            bytes: [...file.buffer],
        },
    )
}

async function mockDisplayMedia(page: Page): Promise<void> {
    await page.addInitScript(() => {
        Object.defineProperty(navigator.mediaDevices, 'getDisplayMedia', {
            configurable: true,
            value: async () => {
                const canvas = document.createElement('canvas')
                canvas.width = 160
                canvas.height = 90
                const ctx = canvas.getContext('2d')
                let frame = 0
                const draw = () => {
                    if (!ctx) return
                    ctx.fillStyle = frame % 2 === 0 ? '#30c5f7' : '#111827'
                    ctx.fillRect(0, 0, canvas.width, canvas.height)
                    ctx.fillStyle = '#ffffff'
                    ctx.font = '20px sans-serif'
                    ctx.fillText('upup', 50, 52)
                    frame += 1
                }
                draw()
                const interval = window.setInterval(draw, 100)
                const stream = canvas.captureStream(10)
                for (const track of stream.getVideoTracks()) {
                    track.addEventListener('ended', () =>
                        window.clearInterval(interval),
                    )
                }
                return stream
            },
        })
    })
}

type MultipartMockLog = {
    initBodies: Array<Record<string, unknown>>
    signBodies: Array<Record<string, unknown>>
    completeBodies: Array<Record<string, unknown>>
    abortBodies: Array<Record<string, unknown>>
    partNumbers: number[]
    failedParts: number[]
    badResponses: Array<{ status: number; url: string }>
    maxActiveParts: number
    setDelayMs: (delayMs: number) => void
}

async function routeMultipartMock(
    page: Page,
    options: {
        partSize?: number
        failPartOnce?: number
        delayMs?: number
    } = {},
): Promise<MultipartMockLog> {
    let delayMs = options.delayMs ?? 0
    const log: MultipartMockLog = {
        initBodies: [],
        signBodies: [],
        completeBodies: [],
        abortBodies: [],
        partNumbers: [],
        failedParts: [],
        badResponses: [],
        maxActiveParts: 0,
        setDelayMs: nextDelayMs => {
            delayMs = nextDelayMs
        },
    }
    let uploadCounter = 0
    let activeParts = 0
    let failedOnce = false
    const partSize = options.partSize ?? 1024 * 1024

    page.on('response', response => {
        if (
            response.url().includes('/api/upup-multipart/') &&
            response.status() >= 400
        ) {
            log.badResponses.push({
                status: response.status(),
                url: response.url(),
            })
        }
    })

    await page.route('**/api/upup-multipart/multipart/init', async route => {
        const body = JSON.parse(route.request().postData() ?? '{}')
        log.initBodies.push(body)
        uploadCounter += 1
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                key: `multipart/${uploadCounter}-${body.name ?? 'file.bin'}`,
                uploadId: `upload-${uploadCounter}`,
                partSize,
                expiresIn: 3600,
            }),
        })
    })

    await page.route(
        '**/api/upup-multipart/multipart/sign-part',
        async route => {
            const body = JSON.parse(route.request().postData() ?? '{}')
            log.signBodies.push(body)
            const requestUrl = new URL(route.request().url())
            const partNumber = Number(body.partNumber)
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    uploadUrl: `${requestUrl.origin}/api/upup-multipart/part/${body.uploadId}/${partNumber}`,
                    uploadHeaders: { 'x-upup-part-number': String(partNumber) },
                    expiresIn: 3600,
                }),
            })
        },
    )

    await page.route(
        '**/api/upup-multipart/multipart/complete',
        async route => {
            const body = JSON.parse(route.request().postData() ?? '{}')
            log.completeBodies.push(body)
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    key: body.key,
                    publicUrl: `/api/upup-multipart/public/${body.key}`,
                    etag: '"multipart-complete"',
                }),
            })
        },
    )

    await page.route('**/api/upup-multipart/multipart/abort', async route => {
        log.abortBodies.push(JSON.parse(route.request().postData() ?? '{}'))
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ ok: true }),
        })
    })

    await page.route('**/api/upup-multipart/part/**', async route => {
        const partNumber = Number(
            route.request().headers()['x-upup-part-number'] ?? '0',
        )
        activeParts += 1
        log.maxActiveParts = Math.max(log.maxActiveParts, activeParts)
        try {
            if (
                options.failPartOnce &&
                partNumber === options.failPartOnce &&
                !failedOnce
            ) {
                failedOnce = true
                log.failedParts.push(partNumber)
                await route.fulfill({
                    status: 503,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        error: 'Mock multipart part failure',
                    }),
                })
                return
            }
            if (delayMs) {
                // sleep-allow(mock network latency — parametrized delayMs shapes the response timing the test observes)
                await new Promise(resolve => setTimeout(resolve, delayMs))
            }
            try {
                await route.fulfill({
                    status: 200,
                    headers: { ETag: `"part-${partNumber}"` },
                    body: '',
                })
                log.partNumbers.push(partNumber)
            } catch {
                // Slow multipart control tests intentionally abort in-flight
                // part requests; the browser-side assertions cover the abort.
            }
        } finally {
            activeParts -= 1
        }
    })

    return log
}

test.beforeEach(async ({ page }) => {
    const issues: BrowserIssue[] = []
    browserIssues.set(page, issues)

    page.on('console', message => {
        if (message.type() !== 'error') return
        issues.push({ source: 'console', text: message.text() })
    })

    page.on('pageerror', error => {
        issues.push({ source: 'pageerror', text: error.message })
    })

    page.on('requestfailed', request => {
        const url = request.url()
        if (url.includes('/_next/webpack-hmr')) return
        if (url.startsWith('blob:')) return
        if (
            url.includes('/api/upup-mock/processing') &&
            request.failure()?.errorText === 'net::ERR_ABORTED'
        )
            return
        if (
            url.includes('/api/upup-server-mock/files/') &&
            request.failure()?.errorText === 'net::ERR_ABORTED'
        )
            return
        if (
            url.includes('/api/upup-multipart/part/') &&
            request.failure()?.errorText === 'net::ERR_ABORTED'
        )
            return
        issues.push({
            source: 'requestfailed',
            text: `${request.method()} ${url}: ${request.failure()?.errorText ?? 'failed'}`,
        })
    })
})

test.afterEach(async ({ page }) => {
    const issues = (browserIssues.get(page) ?? []).filter(issue => {
        if (
            allowExpectedMockFailure.has(page) &&
            issue.source === 'console' &&
            issue.text.includes('503')
        ) {
            return false
        }
        if (
            allowExpectedResourceFailure.has(page) &&
            issue.source === 'console' &&
            issue.text.includes('404 (Not Found)')
        ) {
            return false
        }
        return true
    })
    expect(issues).toEqual([])
})

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

test('routes large server-mode uploads through multipart init, parts, and complete', async ({
    page,
}, testInfo) => {
    const multipart = await routeMultipartMock(page, { partSize: 1024 * 1024 })
    const directObjectRequests: string[] = []
    page.on('request', request => {
        if (
            request.method() === 'PUT' &&
            request.url().includes('/api/upup-mock/object/')
        ) {
            directObjectRequests.push(request.url())
        }
    })

    await openPlayground(page, `?mockRun=${uniqueRun('multipart-threshold')}`)
    await openCategory(page, 'Advanced')
    await clickRadio(page, 'Advanced', 'server')
    await fillTextField(page, 'Advanced', 'Server URL', '/api/upup-multipart')

    await openCategory(page, 'Upload')
    await clickRadio(page, 'Upload', 'tus')
    await clickRadio(page, 'Upload', 'multipart')
    await setSizeUnit(page, 'Upload', 'Chunk size', '1', 'MB')

    await selectFiles(page, [
        generatedFile('multipart-threshold.txt', 6 * 1024 * 1024),
    ])
    await page.getByTestId('upup-upload-btn').click()
    await expect
        .poll(async () => ({
            state: await page
                .getByTestId('upup-root')
                .getAttribute('data-state'),
            badResponses: multipart.badResponses,
        }))
        .toMatchObject({ state: 'successful' })

    expect(multipart.initBodies).toHaveLength(1)
    expect(multipart.signBodies.map(body => body.partNumber)).toEqual([
        1, 2, 3, 4, 5, 6,
    ])
    expect(multipart.partNumbers.sort((a, b) => a - b)).toEqual([
        1, 2, 3, 4, 5, 6,
    ])
    expect(multipart.completeBodies).toHaveLength(1)
    expect(
        (
            multipart.completeBodies[0].parts as Array<{ partNumber: number }>
        ).map(part => part.partNumber),
    ).toEqual([1, 2, 3, 4, 5, 6])
    expect(directObjectRequests).toEqual([])
    await attachScreenshot(page, testInfo, 'multipart-threshold-complete')
})

test('retries a multipart upload after one failed part and completes successfully', async ({
    page,
}, testInfo) => {
    allowExpectedMockFailure.add(page)
    const multipart = await routeMultipartMock(page, {
        partSize: 1024 * 1024,
        failPartOnce: 2,
    })

    await openPlayground(page, `?mockRun=${uniqueRun('multipart-retry')}`)
    await openCategory(page, 'Advanced')
    await clickRadio(page, 'Advanced', 'server')
    await fillTextField(page, 'Advanced', 'Server URL', '/api/upup-multipart')

    await openCategory(page, 'Upload')
    await clickRadio(page, 'Upload', 'tus')
    await clickRadio(page, 'Upload', 'multipart')
    await setSizeUnit(page, 'Upload', 'Chunk size', '1', 'MB')
    await setNumber(page, 'Max retries', '1')

    await selectFiles(page, [
        generatedFile('multipart-retry.txt', 6 * 1024 * 1024),
    ])
    await page.getByTestId('upup-upload-btn').click()
    await expect
        .poll(async () => ({
            state: await page
                .getByTestId('upup-root')
                .getAttribute('data-state'),
            badResponses: multipart.badResponses,
        }))
        .toMatchObject({ state: 'successful' })

    expect(multipart.failedParts).toEqual([2])
    expect(multipart.initBodies.length).toBeGreaterThanOrEqual(2)
    expect(multipart.abortBodies.length).toBeGreaterThanOrEqual(1)
    expect(multipart.completeBodies).toHaveLength(1)
    await attachScreenshot(
        page,
        testInfo,
        'multipart-failed-part-retry-success',
    )
})

test('pauses, resumes, and cancels slow multipart uploads', async ({
    page,
}, testInfo) => {
    const multipart = await routeMultipartMock(page, {
        partSize: 1024 * 1024,
        delayMs: 1_200,
    })

    await openPlayground(page, `?mockRun=${uniqueRun('multipart-controls')}`)
    await openCategory(page, 'Advanced')
    await clickRadio(page, 'Advanced', 'server')
    await fillTextField(page, 'Advanced', 'Server URL', '/api/upup-multipart')

    await openCategory(page, 'Upload')
    await clickRadio(page, 'Upload', 'tus')
    await clickRadio(page, 'Upload', 'multipart')
    await setSizeUnit(page, 'Upload', 'Chunk size', '1', 'MB')
    await setNumber(page, 'Max retries', '0')

    await selectFiles(page, [
        generatedFile('multipart-pause-resume.txt', 6 * 1024 * 1024),
    ])
    await page.getByTestId('upup-upload-btn').click()
    await expect(page.getByTestId('upup-root')).toHaveAttribute(
        'data-state',
        'uploading',
    )
    await expect(page.getByTestId('upup-upload-pause-toggle')).toHaveAttribute(
        'aria-label',
        'Pause',
    )
    await expect(page.getByTestId('upup-upload-cancel-btn')).toBeVisible()
    await expect.poll(() => multipart.signBodies.length).toBeGreaterThan(0)
    await attachScreenshot(page, testInfo, 'multipart-controls-ongoing')

    await page.getByTestId('upup-upload-pause-toggle').click()
    await expect(page.getByTestId('upup-root')).toHaveAttribute(
        'data-state',
        'paused',
    )
    await expect(page.getByTestId('upup-upload-pause-toggle')).toHaveAttribute(
        'aria-label',
        'Resume',
    )
    await expect(page.getByTestId('upup-root')).toContainText('Paused')
    const signCountWhilePaused = multipart.signBodies.length
    // sleep-allow(negative-assertion window — proves NO further sign-part requests fire while paused; absence has no event to await)
    await page.waitForTimeout(500)
    expect(multipart.signBodies.length).toBe(signCountWhilePaused)
    await expect
        .poll(() => multipart.abortBodies.length)
        .toBeGreaterThanOrEqual(1)
    await attachScreenshot(page, testInfo, 'multipart-controls-paused')

    await page.getByTestId('upup-upload-pause-toggle').click()
    await expect(page.getByTestId('upup-root')).toHaveAttribute(
        'data-state',
        'uploading',
    )
    await expect(page.getByTestId('upup-upload-pause-toggle')).toHaveAttribute(
        'aria-label',
        'Pause',
    )
    await attachScreenshot(page, testInfo, 'multipart-controls-resumed')

    await expect(page.getByTestId('upup-root')).toHaveAttribute(
        'data-state',
        'successful',
    )
    expect(multipart.initBodies.length).toBeGreaterThanOrEqual(2)
    expect(multipart.completeBodies).toHaveLength(1)
    await attachScreenshot(page, testInfo, 'multipart-controls-resume-success')

    await page.getByRole('button', { name: 'Done' }).click()
    await expect(page.getByTestId('upup-file-item')).toHaveCount(0)

    const abortCountBeforeCancel = multipart.abortBodies.length
    await selectFiles(page, [
        generatedFile('multipart-cancel.txt', 6 * 1024 * 1024),
    ])
    await page.getByTestId('upup-upload-btn').click()
    await expect(page.getByTestId('upup-root')).toHaveAttribute(
        'data-state',
        'uploading',
    )
    await expect(page.getByTestId('upup-upload-cancel-btn')).toBeVisible()
    await expect
        .poll(() => multipart.initBodies.length)
        .toBeGreaterThanOrEqual(3)
    await attachScreenshot(page, testInfo, 'multipart-controls-cancel-ongoing')

    await page.getByTestId('upup-upload-cancel-btn').click()
    await expect(page.getByTestId('upup-file-item')).toHaveCount(0)
    await expect(page.getByTestId('upup-root')).toHaveAttribute(
        'data-state',
        'idle',
    )
    await expect
        .poll(() => multipart.abortBodies.length)
        .toBeGreaterThan(abortCountBeforeCancel)
    await attachScreenshot(page, testInfo, 'multipart-controls-cancelled')
})

test('restores a crash recovery upload after reload and resumes to success', async ({
    page,
}, testInfo) => {
    const multipart = await routeMultipartMock(page, {
        partSize: 1024 * 1024,
        delayMs: 10_000,
    })

    await openPlayground(page, `?mockRun=${uniqueRun('crash-recovery')}`)
    await clearCrashRecoverySnapshot(page)
    await openCategory(page, 'Advanced')
    await clickRadio(page, 'Advanced', 'server')
    await fillTextField(page, 'Advanced', 'Server URL', '/api/upup-multipart')

    await openCategory(page, 'Upload')
    await checkSidebarCheckbox(page, 'Upload', 'Crash recovery (IndexedDB)')
    await clickRadio(page, 'Upload', 'tus')
    await clickRadio(page, 'Upload', 'multipart')
    await setSizeUnit(page, 'Upload', 'Chunk size', '1', 'MB')
    await setNumber(page, 'Max retries', '0')

    await selectFiles(page, [
        generatedFile('crash-recovery-resume.txt', 6 * 1024 * 1024),
    ])
    await page.getByTestId('upup-upload-btn').click()
    await expect(page.getByTestId('upup-root')).toHaveAttribute(
        'data-state',
        'uploading',
    )
    await expect
        .poll(
            async () => {
                const snapshot = await readCrashRecoverySnapshot(page)
                const status = snapshot?.status
                const file = snapshot?.files?.[0]?.[1]
                const name = file?.name ?? file?.file?.name
                const ready =
                    Array.isArray(snapshot?.files) &&
                    snapshot.files.length === 1 &&
                    name === 'crash-recovery-resume.txt' &&
                    (status === 'PROCESSING' || status === 'UPLOADING')
                return ready
                    ? 'ready'
                    : JSON.stringify({
                          snapshotType:
                              Object.prototype.toString.call(snapshot),
                          keys:
                              snapshot && typeof snapshot === 'object'
                                  ? Object.keys(snapshot)
                                  : [],
                          fileCount: Array.isArray(snapshot?.files)
                              ? snapshot.files.length
                              : 0,
                          status,
                          fileKeys:
                              file && typeof file === 'object'
                                  ? Object.keys(file)
                                  : [],
                          name,
                      })
            },
            { timeout: 20_000 },
        )
        .toBe('ready')
    await expect.poll(() => multipart.signBodies.length).toBeGreaterThan(0)
    await attachScreenshot(page, testInfo, 'crash-recovery-before-reload')

    multipart.setDelayMs(25)
    await page.reload()
    await expect(
        page.getByRole('heading', { name: 'Upup Playground' }),
    ).toBeVisible()
    await expect(page.getByTestId('upup-root')).toBeVisible()

    await openCategory(page, 'Advanced')
    await clickRadio(page, 'Advanced', 'server')
    await fillTextField(page, 'Advanced', 'Server URL', '/api/upup-multipart')

    await openCategory(page, 'Upload')
    await clickRadio(page, 'Upload', 'tus')
    await clickRadio(page, 'Upload', 'multipart')
    await setSizeUnit(page, 'Upload', 'Chunk size', '1', 'MB')
    await setNumber(page, 'Max retries', '0')
    await checkSidebarCheckbox(page, 'Upload', 'Crash recovery (IndexedDB)')

    await expect(page.getByTestId('upup-file-list')).toContainText(
        'crash-recovery-resume.txt',
    )
    await expect(page.getByTestId('upup-root')).toHaveAttribute(
        'data-state',
        'paused',
    )
    await expect(page.getByTestId('upup-upload-pause-toggle')).toHaveAttribute(
        'aria-label',
        'Resume',
    )
    await attachScreenshot(page, testInfo, 'crash-recovery-restored-paused')

    await page.getByTestId('upup-upload-pause-toggle').click()
    await expect(page.getByTestId('upup-root')).toHaveAttribute(
        'data-state',
        'uploading',
    )
    await expect(page.getByTestId('upup-root')).toHaveAttribute(
        'data-state',
        'successful',
    )
    expect(multipart.initBodies.length).toBeGreaterThanOrEqual(2)
    expect(multipart.completeBodies).toHaveLength(1)
    await expect.poll(async () => readCrashRecoverySnapshot(page)).toBeNull()
    await attachScreenshot(page, testInfo, 'crash-recovery-resumed-success')
})

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
