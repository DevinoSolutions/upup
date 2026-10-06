import { test as base, expect, type Page, type Request } from '@playwright/test'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import {
    TELEMETRY_PATH,
    rewriteTelemetryPath,
} from '../../landing/src/lib/analytics/telemetry-proxy'
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

// posthog-js capture endpoints, /e/ (first request) and /i/v0/e/ (batches), as
// the browser requests them: through the landing app's first-party path. A
// capture sent straight to the PostHog host never counts as delivered.
const CAPTURE_PATHS = new Set(
    ['/e/', '/i/v0/e/'].map(
        path =>
            rewriteTelemetryPath(
                new URL(`${TELEMETRY_PATH}${path}`, 'http://localhost'),
            ).pathname,
    ),
)

/** Whether a URL is a posthog-js capture endpoint on the first-party path. */
export function isCaptureUrl(url: string): boolean {
    return CAPTURE_PATHS.has(new URL(url).pathname)
}

/** Event names carried by one posthog-js capture request (gzip or plain JSON). */
function capturedEventNames(request: Request): string[] {
    const body = request.postDataBuffer()
    if (!body) return []
    let text: string
    try {
        text = gunzipSync(body).toString('utf8')
    } catch {
        text = body.toString('utf8')
    }
    return [...text.matchAll(/"event":"([^"]+)"/g)].map(m => m[1] as string)
}

export interface AnalyticsDelivery {
    /** Resolves once a capture request carrying the event got a 2xx back. */
    delivered(eventName: string): Promise<void>
    /** Requests that bypassed the first-party path for a PostHog host. */
    readonly direct: string[]
}

/**
 * Observe which PostHog events the browser has actually DELIVERED (2xx from the
 * capture endpoint). Start it BEFORE the page does anything that captures, so a
 * batch that goes out early is still seen. This is the only honest "it left the
 * browser" signal: posthog.shutdown() resolves immediately and flushes through
 * a request nobody awaits, so a test that ends right after it races context
 * teardown and loses the final batch (nightly 2026-10-02: the thumbs rating +
 * comment never ingested while the flow itself went green).
 */
export function trackAnalyticsDelivery(page: Page): AnalyticsDelivery {
    const seen = new Set<string>()
    const waiting = new Map<string, Array<() => void>>()
    const direct: string[] = []
    page.on('request', request => {
        const { host, origin, pathname } = new URL(request.url())
        if (/posthog/i.test(host)) direct.push(`${origin}${pathname}`)
    })
    page.on('response', response => {
        if (!response.ok()) return
        if (!isCaptureUrl(response.url())) return
        for (const name of capturedEventNames(response.request())) {
            seen.add(name)
            for (const resolve of waiting.get(name) ?? []) resolve()
            waiting.delete(name)
        }
    })
    return {
        direct,
        delivered(eventName) {
            if (seen.has(eventName)) return Promise.resolve()
            return new Promise<void>(resolve => {
                waiting.set(eventName, [
                    ...(waiting.get(eventName) ?? []),
                    resolve,
                ])
            })
        },
    }
}

/**
 * Block until every named event has been delivered. posthog-js's own batch
 * timer sends the queue (a few seconds at most); the test timeout bounds the
 * wait and there are no fixed sleeps. Deliberately NOT posthog.shutdown(): it
 * flushes through a beacon whose response is unobservable, so nothing can be
 * awaited — the page must stay open until the capture endpoint ACKs.
 */
export async function awaitAnalyticsDelivered(
    delivery: AnalyticsDelivery,
    eventNames: string[],
): Promise<void> {
    await Promise.all(eventNames.map(name => delivery.delivered(name)))
    // Ad blockers filter the PostHog host; nothing may go to it directly.
    expect(delivery.direct).toEqual([])
}
