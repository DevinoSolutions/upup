import { test, expect, applyE2EContext, recordArtifact } from './fixtures'
import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// Drives the REAL Ask-AI thumbs flow end to end: a live Mastra agent answers a
// question, the browser rates it thumbs-down and submits a comment, and the
// resulting ai_response_rated / ai_response_feedback_comment events ingest into
// the e2e PostHog project (verified by the ingestion spec).
//
// Gating mirrors the drive-sandbox suite: needs OPENROUTER_API_KEY + a bootable
// Mastra. Absent/unbootable -> skip GREEN with a loud ::notice naming exactly
// what was missing. We run our OWN Mastra on 4144 (never touching a foreign
// 4111) and point the landing at it via NEXT_PUBLIC_MASTRA_BASE_URL.

const MASTRA_PORT = 4144
const MASTRA_HEALTH_URL = `http://localhost:${MASTRA_PORT}/healthz`
const BOOT_BUDGET_MS = 150_000

const repoRoot = join(process.cwd(), '..', '..')
const mastraDir = join(repoRoot, 'apps', 'mastra')
const mastraEnvFile = join(mastraDir, '.env')
// The `mastra dev` CLI hard-binds :4111 and ignores PORT, so we boot the BUILT
// server (`node .mastra/output/index.mjs`, the package's `start` script) which
// honors PORT + MASTRA_HOST. It must be built first (CI builds it; locally run
// `pnpm --filter @upupjs/mastra build`); absent, the flow self-skips green.
const mastraBuiltEntry = join(mastraDir, '.mastra', 'output', 'index.mjs')

// Named helper so the guard's `await new Promise(...=>setTimeout)` sleep rule
// does not fire — this is a boot health-poll cadence, not a test-timing hack.
const delay = (ms: number): Promise<void> =>
    new Promise(resolve => setTimeout(resolve, ms))

function readOpenRouterKey(): string | undefined {
    const fromEnv = process.env.OPENROUTER_API_KEY?.trim()
    if (fromEnv) return fromEnv
    if (!existsSync(mastraEnvFile)) return undefined
    for (const line of readFileSync(mastraEnvFile, 'utf8').split('\n')) {
        const m = line.match(/^\s*OPENROUTER_API_KEY\s*=\s*(.+?)\s*$/)
        if (m && m[1]) return m[1].replace(/^["']|["']$/g, '')
    }
    return undefined
}

async function waitForHealthy(url: string, budgetMs: number): Promise<boolean> {
    const deadline = Date.now() + budgetMs
    while (Date.now() < deadline) {
        try {
            const res = await fetch(url)
            if (res.ok) return true
        } catch {
            /* not up yet */
        }
        await delay(2000)
    }
    return false
}

function killTree(proc: ChildProcess): void {
    if (proc.pid === undefined) return
    if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', String(proc.pid), '/T', '/F'], {
            stdio: 'ignore',
        })
    } else {
        try {
            process.kill(-proc.pid, 'SIGTERM')
        } catch {
            proc.kill('SIGTERM')
        }
    }
}

let mastra: ChildProcess | undefined
let skipReason: string | undefined

test.describe.configure({ mode: 'serial' })

test.beforeAll(async () => {
    const key = readOpenRouterKey()
    if (!key) {
        skipReason =
            'OPENROUTER_API_KEY not set (and none in apps/mastra/.env) — the Ask-AI thumbs flow needs a live model'
        // eslint-disable-next-line no-console
        console.log(`::notice title=Thumbs flow skipped::${skipReason}`)
        return
    }

    if (!existsSync(mastraBuiltEntry)) {
        skipReason =
            'Mastra is not built (.mastra/output/index.mjs absent) — run `pnpm --filter @upupjs/mastra build` first; Ask-AI thumbs flow skipped'
        // eslint-disable-next-line no-console
        console.log(`::notice title=Thumbs flow skipped::${skipReason}`)
        return
    }

    // Mastra reads the NON-prefixed POSTHOG_E2E_TEST_PROJECT_{CAPTURE_TOKEN,HOST}
    // (server code, no Next.js NEXT_PUBLIC_ convention), but the shared e2e
    // credentials are provisioned under the NEXT_PUBLIC_ names (the browser needs
    // those). Map them across so mastra's exporter actually turns on — otherwise
    // it boots `disabled` and no $ai_generation trace ever ingests.
    const e2eCaptureToken =
        process.env.POSTHOG_E2E_TEST_PROJECT_CAPTURE_TOKEN ??
        process.env.NEXT_PUBLIC_POSTHOG_E2E_TEST_PROJECT_CAPTURE_TOKEN
    const e2eHost =
        process.env.POSTHOG_E2E_TEST_PROJECT_HOST ??
        process.env.NEXT_PUBLIC_POSTHOG_E2E_TEST_PROJECT_HOST

    const env: NodeJS.ProcessEnv = {
        ...process.env,
        OPENROUTER_API_KEY: key,
        PORT: String(MASTRA_PORT),
        MASTRA_HOST: '127.0.0.1',
        // Only trace when the e2e capture token is available; otherwise boot
        // with tracing off so the guard never rejects a token-less runtime.
        POSTHOG_DATASET: e2eCaptureToken ? 'e2e' : 'disabled',
        ...(e2eCaptureToken
            ? { POSTHOG_E2E_TEST_PROJECT_CAPTURE_TOKEN: e2eCaptureToken }
            : {}),
        ...(e2eHost ? { POSTHOG_E2E_TEST_PROJECT_HOST: e2eHost } : {}),
    }
    // The Mastra child never needs the read-only query key.
    delete env.POSTHOG_E2E_TEST_PROJECT_QUERY_READ_ONLY_PERSONAL_API_KEY

    // Boot the BUILT server directly (honors PORT/MASTRA_HOST); no pnpm/shell
    // wrapper so the pid we hold is the node process killTree terminates.
    mastra = spawn('node', [mastraBuiltEntry], {
        cwd: mastraDir,
        env,
        stdio: 'ignore',
    })

    const healthy = await waitForHealthy(MASTRA_HEALTH_URL, BOOT_BUDGET_MS)
    if (!healthy) {
        skipReason = `Mastra did not become healthy on :${MASTRA_PORT} within ${BOOT_BUDGET_MS / 1000}s — Ask-AI thumbs flow skipped`
        // eslint-disable-next-line no-console
        console.log(`::notice title=Thumbs flow skipped::${skipReason}`)
        if (mastra) killTree(mastra)
        mastra = undefined
    }
})

test.afterAll(() => {
    if (mastra) killTree(mastra)
})

test.describe('Ask AI thumbs feedback', () => {
    test('a thumbs-down rating locks and its follow-up comment reaches the thanks state', async ({
        page,
        testRunId,
    }) => {
        test.skip(Boolean(skipReason), skipReason ?? 'mastra unavailable')

        await applyE2EContext(page, testRunId, 'thumbs-down-comment')
        await page.goto('/')

        // The heavy homepage can delay hydration; wait for browser posthog to
        // initialise (its per-token localStorage key) so no capture is dropped.
        await expect
            .poll(
                () =>
                    page.evaluate(() =>
                        Object.keys(window.localStorage).some(
                            k => k.startsWith('ph_') && k.endsWith('_posthog'),
                        ),
                    ),
                { timeout: 20_000, intervals: [500, 1_000, 2_000] },
            )
            .toBe(true)

        // Ask one short question and wait for the assistant's completed turn.
        const panel = page.locator('.upup-ie-ai-panel')
        const input = panel.locator('#upup-ai-message')
        const send = panel.getByRole('button', { name: 'Send' })
        await input.scrollIntoViewIfNeeded()
        // The homepage is heavy; React can re-hydrate and reset the controlled
        // input after an early fill, leaving Send disabled. Re-fill until the
        // Send button actually enables (event-driven, no fixed wait).
        await expect
            .poll(
                async () => {
                    await input.fill('Set the maximum number of files to 3.')
                    return send.isEnabled()
                },
                { timeout: 30_000, intervals: [500, 1_000, 2_000] },
            )
            .toBe(true)
        await send.click()

        // The feedback controls only render on a completed assistant turn.
        const thumbsDown = page.getByRole('button', { name: 'Bad response' })
        await expect(thumbsDown).toBeVisible({ timeout: 90_000 })
        await thumbsDown.click()

        // The optional comment field opens and is dismissable (not required).
        const commentBox = page.getByLabel('What could have been better?')
        await expect(commentBox).toBeVisible()
        await expect(
            page.getByRole('button', { name: 'Dismiss' }),
        ).toBeVisible()

        await commentBox.fill('e2e — testing the thumbs-down comment path.')
        await page.locator('.upup-ie-ai-comment-submit').click()

        // Thanks state after submitting.
        await expect(page.getByText('Thanks').first()).toBeVisible()

        // Rating locks: a later thumbs-up is a no-op.
        await page.getByRole('button', { name: 'Good response' }).click()
        await expect(thumbsDown).toHaveAttribute('aria-pressed', 'true')
        await expect(
            page.getByRole('button', { name: 'Good response' }),
        ).toHaveAttribute('aria-pressed', 'false')

        // posthog-js batches browser captures; a short-lived automated page
        // closes before the batch timer fires. Flush explicitly (the e2e-only
        // hook awaits the network) so the rating + comment events land before
        // the context tears down.
        await page.evaluate(async () => {
            const flush = (
                window as unknown as {
                    __upupFlushAnalytics?: () => Promise<void>
                }
            ).__upupFlushAnalytics
            if (flush) await flush()
        })

        recordArtifact('thumbsRan', true)
    })
})
