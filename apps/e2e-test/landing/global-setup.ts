import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { RUN_CONTEXT_FILE, makeTestRunId } from './run-context'

/**
 * Mint the run's correlation id ONCE before any worker starts and persist it,
 * so every spec (including the serial ingestion spec) reads an identical value.
 * `UPUP_E2E_TEST_RUN_ID` overrides it (a CI job can pin a known id).
 */
export default function globalSetup(): void {
    const testRunId =
        process.env.UPUP_E2E_TEST_RUN_ID?.trim() || makeTestRunId()
    mkdirSync(dirname(RUN_CONTEXT_FILE), { recursive: true })
    writeFileSync(RUN_CONTEXT_FILE, JSON.stringify({ testRunId }), 'utf8')
    // eslint-disable-next-line no-console
    console.log(`[landing-e2e] test_run_id = ${testRunId}`)
}
