import {
    test,
    expect,
    applyE2EContext,
    awaitAnalyticsDelivered,
    recordArtifact,
    trackAnalyticsDelivery,
} from './fixtures'

// Drives the homepage hero's install box the way a converting visitor does:
// pick a package manager, press copy. The copy is the site's main conversion
// and fires `install_command_copied` into the shared PostHog e2e project; the
// ingestion-verification spec (runs last) proves it landed with this run's
// correlation ids and the chosen package manager.

test.describe('homepage install command copy', () => {
    test('copying the pnpm install command fills the clipboard and captures the conversion', async ({
        page,
        context,
        testRunId,
    }) => {
        await context.grantPermissions(['clipboard-read', 'clipboard-write'])
        const delivery = trackAnalyticsDelivery(page)
        await applyE2EContext(page, testRunId, 'install-copy')
        await page.goto('/')

        await page.getByRole('button', { name: 'Package manager' }).click()
        await page
            .getByRole('listbox', { name: 'Package manager' })
            .getByRole('option', { name: 'pnpm', exact: true })
            .click()
        await page.getByRole('button', { name: 'Copy install command' }).click()

        await expect
            .poll(() => page.evaluate(() => navigator.clipboard.readText()))
            .toBe('pnpm add @useupup/react')

        // posthog-js batches browser captures; keep the page open until the
        // capture endpoint has ACKed the event, so teardown cannot drop it.
        await awaitAnalyticsDelivered(delivery, ['install_command_copied'])

        recordArtifact('installCopyScenario', 'install-copy')
    })
})
