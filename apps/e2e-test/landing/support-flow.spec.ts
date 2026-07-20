import { test, expect, applyE2EContext, recordArtifact } from './fixtures'
import type { Page, Request } from '@playwright/test'

// Drives the real /support page against the landing dev server booted on the
// `e2e` dataset (playwright.landing.config.ts). The happy-path submission
// ingests a real `support_request_submitted` event into the shared PostHog e2e
// project — the ingestion-verification spec (runs last) proves it landed.

const SUPPORT_URL = '/support/'
const ENDPOINT = '/api/upup-support'

function isSupportPost(req: Request): boolean {
    return req.url().includes(ENDPOINT) && req.method() === 'POST'
}

/** Collect the JSON body of every POST to the support endpoint. */
function collectSupportPosts(page: Page): Array<Record<string, unknown>> {
    const bodies: Array<Record<string, unknown>> = []
    page.on('request', req => {
        if (!isSupportPost(req)) return
        try {
            bodies.push(req.postDataJSON() as Record<string, unknown>)
        } catch {
            /* body-less request — ignore */
        }
    })
    return bodies
}

test.describe('support feedback form', () => {
    test('anonymous submit succeeds, clears the form, and confirms with a toast', async ({
        page,
        testRunId,
    }) => {
        await applyE2EContext(page, testRunId, 'support-happy-path')
        const bodies = collectSupportPosts(page)
        await page.goto(SUPPORT_URL)

        const message = page.getByLabel('Message')
        await message.fill(
            'Playwright e2e — upload stalls at 50% on large files.',
        )

        const responsePromise = page.waitForResponse(
            r => isSupportPost(r.request()) && r.status() === 200,
        )
        await page.getByRole('button', { name: 'Send request' }).click()
        const response = await responsePromise

        const body = (await response.json()) as {
            ok: boolean
            feedbackId: string
        }
        expect(body.ok).toBe(true)
        expect(body.feedbackId).toBeTruthy()

        await expect(page.getByText(/we got it/i)).toBeVisible()
        await expect(message).toHaveValue('')

        // Hand the submitted id + scenario to the ingestion-verification spec.
        expect(bodies.length).toBe(1)
        expect(bodies[0].feedbackId).toBe(body.feedbackId)
        expect(bodies[0].testRunId).toBe(testRunId)
        recordArtifact('supportFeedbackId', body.feedbackId)
        recordArtifact('supportScenario', 'support-happy-path')
    })

    test('a requested reply without an email is blocked client-side before any POST', async ({
        page,
        testRunId,
    }) => {
        await applyE2EContext(page, testRunId, 'support-reply-guard')
        const bodies = collectSupportPosts(page)
        await page.goto(SUPPORT_URL)

        await page
            .getByLabel('Message')
            .fill('I want a reply but gave no email.')
        await page.getByRole('checkbox', { name: /reply/i }).check()
        await page.getByRole('button', { name: 'Send request' }).click()

        await expect(page.getByText(/add an email/i)).toBeVisible()
        expect(bodies.length).toBe(0)
    })

    test('double-clicking Send fires exactly one request (in-flight guard)', async ({
        page,
        testRunId,
    }) => {
        await applyE2EContext(page, testRunId, 'support-double-submit')
        const bodies = collectSupportPosts(page)
        await page.goto(SUPPORT_URL)

        await page
            .getByLabel('Message')
            .fill('Double-submit guard check from Playwright.')

        const responsePromise = page.waitForResponse(r =>
            isSupportPost(r.request()),
        )
        await page.getByRole('button', { name: 'Send request' }).dblclick()
        await responsePromise
        await expect(page.getByText(/we got it/i)).toBeVisible()

        expect(bodies.length).toBe(1)
    })

    test('a server failure preserves the message and retries with the same feedbackId', async ({
        page,
        testRunId,
    }) => {
        await applyE2EContext(page, testRunId, 'support-failure-retry')
        const bodies = collectSupportPosts(page)

        // Force the first attempt to fail (both legs down -> 502). page.route is
        // a network-boundary tool, not an app mock — it shapes the transport.
        await page.route(`**${ENDPOINT}/`, route =>
            route.fulfill({
                status: 502,
                contentType: 'application/json',
                body: JSON.stringify({
                    ok: false,
                    feedbackId: '',
                    posthog: 'failed',
                    email: 'failed',
                }),
            }),
        )

        await page.goto(SUPPORT_URL)
        const message = page.getByLabel('Message')
        const text = 'Retry preservation check — this message must survive.'
        await message.fill(text)

        const failed = page.waitForResponse(
            r => isSupportPost(r.request()) && r.status() === 502,
        )
        await page.getByRole('button', { name: 'Send request' }).click()
        await failed

        // Message intact, Retry offered.
        await expect(message).toHaveValue(text)
        const retry = page.getByRole('button', { name: 'Retry' })
        await expect(retry).toBeVisible()

        // Drop the fault, retry for real -> 200.
        await page.unroute(`**${ENDPOINT}/`)
        const succeeded = page.waitForResponse(
            r => isSupportPost(r.request()) && r.status() === 200,
        )
        await retry.click()
        await succeeded
        await expect(page.getByText(/we got it/i)).toBeVisible()

        // Both attempts carried the SAME feedbackId (idempotent retry).
        expect(bodies.length).toBe(2)
        expect(bodies[0].feedbackId).toBe(bodies[1].feedbackId)
        expect(bodies[1].feedbackId).toBeTruthy()
    })
})
