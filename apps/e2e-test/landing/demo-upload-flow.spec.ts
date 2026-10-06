import {
    test,
    expect,
    applyE2EContext,
    awaitAnalyticsDelivered,
    recordArtifact,
    trackAnalyticsDelivery,
} from './fixtures'

// The homepage demo's upload funnel, end to end: a real file goes through the
// landing app's own presign route into a real S3-compatible bucket (LocalStack
// in CI), and the demo_upload_started / demo_upload_succeeded events it fires
// must reach the shared PostHog e2e project. The ingestion-verification spec
// (runs last) proves they landed with this run's ids. Needs the same S3_* +
// UPUP_UPLOAD_TOKEN_SECRET env as demo-upload.spec.ts, plus the PostHog e2e
// capture creds the flows project always needs.

test.describe('homepage demo upload funnel', () => {
    test('a real demo upload captures the started and succeeded funnel events', async ({
        page,
        testRunId,
    }) => {
        const delivery = trackAnalyticsDelivery(page)
        await applyE2EContext(page, testRunId, 'demo-upload')
        await page.goto('/')

        const demo = page.locator('#demo')
        // The demo mounts once it nears the viewport (DeferredInteractiveExample).
        await demo.scrollIntoViewIfNeeded()
        const file = {
            name: 'landing-funnel-demo.txt',
            mimeType: 'text/plain',
            buffer: Buffer.from(`upup demo funnel ${testRunId} ${Date.now()}`),
        }
        await demo
            .locator('[data-testid="upup-file-input"]')
            .setInputFiles(file)
        await expect(demo.getByText(file.name)).toBeVisible()
        await demo.locator('[data-testid="upup-upload-btn"]').click()
        await expect(demo.locator('[data-testid="upup-root"]')).toHaveAttribute(
            'data-state',
            'successful',
        )

        // Keep the page open until the capture endpoint has ACKed both events.
        await awaitAnalyticsDelivered(delivery, [
            'demo_upload_started',
            'demo_upload_succeeded',
        ])

        recordArtifact('demoUploadScenario', 'demo-upload')
    })
})
