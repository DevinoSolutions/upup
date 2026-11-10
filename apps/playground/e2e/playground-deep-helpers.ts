import {
    expect,
    test,
    type Locator,
    type Page,
    type TestInfo,
} from '@playwright/test'

export type BrowserIssue = {
    source: 'console' | 'pageerror' | 'requestfailed'
    text: string
}

export const browserIssues = new WeakMap<Page, BrowserIssue[]>()
export const allowExpectedMockFailure = new WeakSet<Page>()
export const allowExpectedResourceFailure = new WeakSet<Page>()

export const TEXT_SENTINEL = 'PLAYGROUND_TEXT_PREVIEW_SENTINEL'
export const TEXT_CONTENT = [
    'Upup playground deep acceptance file.',
    TEXT_SENTINEL,
    'This proves the browser loaded a real File object and rendered its preview portal.',
].join('\n')

export const RED_PNG_BASE64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAGElEQVR42mP8z8Dwn4GBgYGJAQoAABQABAP8zM2tAAAAAElFTkSuQmCC'

export function textFile(name = 'playground-note.txt') {
    return {
        name,
        mimeType: 'text/plain',
        buffer: Buffer.from(TEXT_CONTENT),
    }
}

export function largeTextFile(
    name = 'large-playground-note.txt',
    bytes = 512 * 1024,
) {
    const chunk = `${TEXT_CONTENT}\n`
    const repeats = Math.ceil(bytes / Buffer.byteLength(chunk))
    return {
        name,
        mimeType: 'text/plain',
        buffer: Buffer.from(chunk.repeat(repeats).slice(0, bytes)),
    }
}

export function imageFile(name = 'preview-image.png') {
    return {
        name,
        mimeType: 'image/png',
        buffer: Buffer.from(RED_PNG_BASE64, 'base64'),
    }
}

export function smallBinaryFile(name = 'tiny.bin') {
    return {
        name,
        mimeType: 'application/octet-stream',
        buffer: Buffer.from([1, 2, 3, 4]),
    }
}

export function generatedFile(
    name: string,
    bytes: number,
    mimeType = 'text/plain',
) {
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

export function uniqueRun(label: string): string {
    return `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export async function openPlayground(page: Page, query = ''): Promise<void> {
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

export function category(page: Page, label: string) {
    return page.locator('section.upup-ie-category').filter({
        has: page.locator('.upup-ie-category-label', { hasText: label }),
    })
}

export function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export async function openCategory(page: Page, label: string): Promise<void> {
    const section = category(page, label).first()
    await expect(section).toBeVisible()
    if ((await section.getAttribute('data-open')) !== 'true') {
        await section.locator('.upup-ie-category-header').click()
    }
    await expect(section).toHaveAttribute('data-open', 'true')
}

export async function checkSidebarCheckbox(
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

export async function uncheckSidebarCheckbox(
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

export async function setNumber(
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

export function labelledField(
    page: Page,
    scope: Locator,
    label: string,
): Locator {
    return scope
        .locator('.upup-ie-field')
        .filter({
            has: page.locator('.upup-ie-field-label', {
                hasText: new RegExp(`^${escapeRegExp(label)}$`),
            }),
        })
        .first()
}

export function nestedFieldset(
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

export async function fillTextField(
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

export async function fillNestedTextField(
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

export async function clickRadio(
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

export async function selectOption(
    page: Page,
    categoryLabel: string,
    label: string,
    value: string,
): Promise<void> {
    const field = labelledField(page, category(page, categoryLabel), label)
    await field.locator('select').selectOption(value)
}

export async function setSizeUnit(
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

export async function setRangeField(
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

export async function fillColorField(
    page: Page,
    categoryLabel: string,
    label: string,
    value: string,
): Promise<void> {
    const field = labelledField(page, category(page, categoryLabel), label)
    await field.locator('input.upup-ie-color-hex').fill(value)
}

export async function ensureSourceTile(
    page: Page,
    label: string,
): Promise<void> {
    const tile = category(page, 'Sources').getByRole('button', {
        name: new RegExp(`^${escapeRegExp(label)}$`),
    })
    if ((await tile.getAttribute('aria-pressed')) !== 'true') {
        await tile.click()
    }
    await expect(tile).toHaveAttribute('aria-pressed', 'true')
}

export async function getGeneratedCode(page: Page): Promise<string> {
    await page
        .locator('.upup-ie-tabs')
        .getByRole('button', { name: 'Code' })
        .click()
    const code = await page.locator('.upup-ie-code-pre').textContent()
    return code ?? ''
}

export async function attachScreenshot(
    page: Page,
    testInfo: TestInfo,
    name: string,
    fullPage = false,
): Promise<void> {
    const path = testInfo.outputPath(`${name}.png`)
    await page.screenshot({ path, fullPage })
    await testInfo.attach(name, { path, contentType: 'image/png' })
}

export async function readCrashRecoverySnapshot(page: Page): Promise<any> {
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

export async function clearCrashRecoverySnapshot(page: Page): Promise<void> {
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

export async function selectFiles(
    page: Page,
    files: ReturnType<typeof textFile>[],
): Promise<void> {
    await page.getByTestId('upup-file-input').setInputFiles(files)
    await expect(page.getByTestId('upup-file-list')).toBeVisible()
}

export async function trySelectFiles(
    page: Page,
    files: ReturnType<typeof textFile>[],
): Promise<void> {
    await page.getByTestId('upup-file-input').setInputFiles(files)
}

export async function dispatchDrop(
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

export async function dispatchPaste(
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

export async function mockDisplayMedia(page: Page): Promise<void> {
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

export type MultipartMockLog = {
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

export async function routeMultipartMock(
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

/**
 * Registers the shared browser-issue guard hooks on the calling spec file.
 * Every playground-deep spec calls this once at top level.
 */
export function registerBrowserIssueGuards(): void {
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
}
