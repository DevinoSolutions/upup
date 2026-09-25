import { test, expect, applyE2EContext } from './fixtures'

// With analytics live (e2e dataset), a page view must not make the browser log
// errors. posthog-js lazy-loads surveys.js from a versioned static path the
// self-hosted instance answers with a 302 to its login page, which the browser
// then blocks on CORS: a console error on every page view, for a feature this
// site has no surveys for. Surveys are disabled at init; this pins it.

test.describe('analytics loads cleanly', () => {
    test('a homepage view with PostHog on requests no surveys bundle and logs no console errors', async ({
        page,
        testRunId,
    }) => {
        const consoleErrors: string[] = []
        const surveyRequests: string[] = []
        page.on('console', msg => {
            if (msg.type() === 'error') consoleErrors.push(msg.text())
        })
        page.on('request', req => {
            if (/surveys(\.min)?\.js/.test(req.url()))
                surveyRequests.push(req.url())
        })

        await applyE2EContext(page, testRunId, 'analytics-console')
        // posthog-js lazy-loads its extensions (surveys among them) from the
        // remote-config callback, and only then sends the first queued capture.
        // So once that first capture POST has answered, any surveys request
        // this page view would make has already been issued.
        const firstCapture = page.waitForResponse(
            res =>
                res.request().method() === 'POST' &&
                /^\/(e|i\/v0\/e)\/$/.test(new URL(res.url()).pathname),
        )
        await page.goto('/')
        expect((await firstCapture).ok()).toBe(true)

        expect(surveyRequests).toEqual([])
        expect(
            consoleErrors.filter(text => /posthog|surveys/i.test(text)),
        ).toEqual([])
    })
})
