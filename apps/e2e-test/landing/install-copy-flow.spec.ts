import { test, expect, applyE2EContext, recordArtifact } from './fixtures'

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

        // posthog-js batches browser captures; flush through the e2e-only hook
        // (it awaits the network) so the event lands before teardown.
        await page.evaluate(async () => {
            const flush = (
                window as unknown as {
                    __upupFlushAnalytics?: () => Promise<void>
                }
            ).__upupFlushAnalytics
            if (flush) await flush()
        })

        recordArtifact('installCopyScenario', 'install-copy')
    })
})
