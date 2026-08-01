import { test as base, expect, type Page } from '@playwright/test'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { ARTIFACTS_FILE, RUN_CONTEXT_FILE } from './run-context'

// Shared landing-e2e fixtures: the run's correlation id, the localStorage
// context injector, the synthetic-identity convention, and a tiny cross-spec
// artifact store (workers:1, so no write race).

/** localStorage key the landing browser reads its e2e context from. */
export const E2E_TEST_CONTEXT_STORAGE_KEY = 'upup:e2e-test-context'

function readTestRunId(): string {
    const fromEnv = process.env.UPUP_E2E_TEST_RUN_ID?.trim()
    if (fromEnv) return fromEnv
    const raw = readFileSync(RUN_CONTEXT_FILE, 'utf8')
    return (JSON.parse(raw) as { testRunId: string }).testRunId
}

export const test = base.extend<{ testRunId: string }>({
    // Playwright fixture signature is (fixtures, use); this one depends on no
    // other fixtures, so the first arg is the empty pattern the API requires.
    // eslint-disable-next-line no-empty-pattern
    testRunId: async ({}, use) => {
        await use(readTestRunId())
    },
})

export { expect }

/**
 * Seed the browser's e2e correlation context BEFORE any page script runs, so
 * PostHog registers the run's super-properties at init. Must be called before
 * `page.goto`.
 */
export async function applyE2EContext(
    page: Page,
    testRunId: string,
    scenario: string,
): Promise<void> {
    await page.addInitScript(
        ({ key, testRunId, scenario }) => {
            window.localStorage.setItem(
                key,
                JSON.stringify({ testRunId, testScenario: scenario }),
            )
        },
        { key: E2E_TEST_CONTEXT_STORAGE_KEY, testRunId, scenario },
    )
}

/** Synthetic distinct id for a run/scenario: `e2e:upup-landing:<run>:<scenario>`. */
export function distinctIdFor(testRunId: string, scenario: string): string {
    return `e2e:upup-landing:${testRunId}:${scenario}`
}

/** Merge a value into the cross-spec artifact store (read by the ingestion spec). */
export function recordArtifact(key: string, value: unknown): void {
    const current = readArtifacts()
    current[key] = value
    writeFileSync(ARTIFACTS_FILE, JSON.stringify(current), 'utf8')
}

export function readArtifacts(): Record<string, unknown> {
    if (!existsSync(ARTIFACTS_FILE)) return {}
    try {
        return JSON.parse(readFileSync(ARTIFACTS_FILE, 'utf8')) as Record<
            string,
            unknown
        >
    } catch {
        return {}
    }
}
