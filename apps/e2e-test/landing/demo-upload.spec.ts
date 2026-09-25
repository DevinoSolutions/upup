import { expect, test, type Page, type Response } from '@playwright/test'

// Proves the landing site's two live demos upload for real: the homepage
// #demo (the interactive example) and the docs-page DocsUploaderDemo. Both
// POST to the landing app's own @useupup/server mount (/api/upup/presign/),
// then PUT the bytes straight to S3-compatible storage with the presigned URL.
// Nothing is mocked: the landing dev server talks to a real S3 API (LocalStack
// in CI, signature validation on), and the test reads the object back through
// the presign response's downloadUrl and compares bytes.
//
// Needs the landing server's S3_* + UPUP_UPLOAD_TOKEN_SECRET env and a bucket
// whose CORS allows the landing origin (the Docs-E2E job in e2e.yml sets both
// up). Without them the presign call fails and so does this spec, loudly.

const PRESIGN_PATH = '/api/upup/presign/'

function uniqueTextFile(label: string) {
    const body = `upup landing ${label} demo upload ${Date.now()}-${Math.random()}`
    return {
        name: `landing-${label}-demo.txt`,
        mimeType: 'text/plain',
        buffer: Buffer.from(body),
    }
}

function isPresign(res: Response): boolean {
    return (
        res.request().method() === 'POST' &&
        new URL(res.url()).pathname === PRESIGN_PATH
    )
}

async function uploadThroughDemo(
    page: Page,
    scope: ReturnType<Page['locator']>,
    label: string,
) {
    const file = uniqueTextFile(label)
    await scope.locator('[data-testid="upup-file-input"]').setInputFiles(file)
    await expect(scope.getByText(file.name)).toBeVisible()

    const presignResponse = page.waitForResponse(isPresign)
    await scope.locator('[data-testid="upup-upload-btn"]').click()

    const presign = await presignResponse
    expect(presign.status(), 'presign status').toBe(200)
    const payload = (await presign.json()) as {
        key?: string
        downloadUrl?: string
    }
    expect(payload.key, 'presigned object key').toMatch(/\S/)
    expect(payload.downloadUrl, 'presign downloadUrl').toMatch(/^https?:\/\//)

    await expect(scope.locator('[data-testid="upup-root"]')).toHaveAttribute(
        'data-state',
        'successful',
    )

    // The object really landed in the bucket, byte for byte.
    const stored = await page.request.get(payload.downloadUrl!)
    expect(stored.status(), 'stored object GET status').toBe(200)
    expect((await stored.body()).equals(file.buffer)).toBe(true)
}

test.describe('landing demos upload to real storage', () => {
    test('homepage interactive demo uploads a file to the bucket', async ({
        page,
    }) => {
        await page.goto('/')
        const demo = page.locator('#demo')
        // The demo mounts once it nears the viewport (DeferredInteractiveExample).
        await demo.scrollIntoViewIfNeeded()
        await expect(demo.getByTestId('demo-upload-notice')).toBeVisible()
        await uploadThroughDemo(page, demo, 'home')
    })

    test('docs page uploader demo uploads a file to the bucket', async ({
        page,
    }) => {
        await page.goto('/docs/getting-started/')
        const demo = page.getByTestId('docs-uploader-demo')
        await expect(demo.getByText(/uploads are real/i)).toBeVisible()
        await uploadThroughDemo(page, demo, 'docs')
    })
})
