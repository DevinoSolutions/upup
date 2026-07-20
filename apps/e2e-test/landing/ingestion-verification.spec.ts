import { test, expect, readArtifacts } from './fixtures'

// Runs LAST (its Playwright project depends on the flows project). Proves the
// events the earlier specs produced ACTUALLY landed in the shared PostHog e2e
// project — a successful network POST is not proof; only the Query API result
// is. Bounded polling (no fixed sleeps), filtered by THIS run's test_run_id.
//
// Gating: the read-only query key is user-provisioned and often absent locally.
// Absent  -> skip GREEN with a loud notice (the flows still ran + ingested).
// Present -> real assertions; an INVALID key (401/403) is RED, never a skip.

const queryKey =
    process.env.POSTHOG_E2E_TEST_PROJECT_QUERY_READ_ONLY_PERSONAL_API_KEY?.trim()
const host = (
    process.env.NEXT_PUBLIC_POSTHOG_E2E_TEST_PROJECT_HOST ??
    process.env.POSTHOG_E2E_TEST_PROJECT_HOST ??
    ''
)
    .trim()
    .replace(/\/$/, '')
const projectId = process.env.POSTHOG_E2E_TEST_PROJECT_ID?.trim()

const SKIP_NOTICE =
    'POSTHOG_E2E_TEST_PROJECT_QUERY_READ_ONLY_PERSONAL_API_KEY not provisioned — ingestion verification skipped'

if (!queryKey) {
    // eslint-disable-next-line no-console
    console.log(`::notice title=Ingestion verification skipped::${SKIP_NOTICE}`)
}

/**
 * Run one HogQL query against the PostHog Query API. Returns result rows
 * (array-of-arrays, column order = SELECT order). An auth/bad-request failure
 * throws (RED — an invalid key must never look like a pass); a transient 5xx /
 * network error returns null so the caller's poll can retry.
 */
async function runHogql(query: string): Promise<unknown[][] | null> {
    let res: Response
    try {
        res = await fetch(`${host}/api/projects/${projectId}/query`, {
            method: 'POST',
            headers: {
                authorization: `Bearer ${queryKey}`,
                'content-type': 'application/json',
            },
            body: JSON.stringify({ query: { kind: 'HogQLQuery', query } }),
        })
    } catch {
        return null // network blip — let the poll retry
    }
    if (res.status === 401 || res.status === 403) {
        throw new Error(
            `PostHog Query API rejected the read key (HTTP ${res.status}) — the key is invalid, not merely absent`,
        )
    }
    if (res.status === 400) {
        throw new Error(
            `PostHog Query API rejected the query (HTTP 400): ${await res.text()}`,
        )
    }
    if (!res.ok) return null // transient upstream error — retry
    const json = (await res.json()) as { results?: unknown[][] }
    return json.results ?? []
}

test.describe('shared PostHog e2e ingestion', () => {
    test.skip(!queryKey, SKIP_NOTICE)

    test('the run credentials resolve to a queryable e2e project', () => {
        // A provisioned key with no host/project is a misconfiguration, not a skip.
        expect(
            host,
            'e2e PostHog host must be set alongside the query key',
        ).not.toBe('')
        expect(
            projectId,
            'POSTHOG_E2E_TEST_PROJECT_ID must be set alongside the query key',
        ).toBeTruthy()
    })

    test('the support_request_submitted event landed with this run’s ids', async ({
        testRunId,
    }) => {
        const artifacts = readArtifacts()
        const expectedFeedbackId = artifacts.supportFeedbackId as
            string | undefined
        expect(
            expectedFeedbackId,
            'support-flow must have recorded a submitted feedbackId',
        ).toBeTruthy()

        const supportQuery = `
            SELECT properties.feedback_id, properties.test_scenario, properties.environment
            FROM events
            WHERE event = 'support_request_submitted'
              AND properties.test_run_id = '${testRunId}'
              AND properties.app_id = 'upup-landing'
              AND timestamp > now() - INTERVAL 2 HOUR
            ORDER BY timestamp DESC
            LIMIT 100`

        let matched: unknown[] | undefined
        await expect
            .poll(
                async () => {
                    const rows = await runHogql(supportQuery)
                    matched = rows?.find(r => r[0] === expectedFeedbackId)
                    return Boolean(matched)
                },
                { timeout: 90_000, intervals: [2_000, 3_000, 5_000, 8_000] },
            )
            .toBe(true)

        expect(matched?.[1]).toBe('support-happy-path')
        expect(matched?.[2]).toBe('e2e')
    })

    test('the AI thumbs events landed and correlate to an $ai_generation trace', async ({
        testRunId,
    }) => {
        const artifacts = readArtifacts()
        test.skip(
            artifacts.thumbsRan !== true,
            'thumbs flow did not run (no OPENROUTER key / mastra) — nothing to verify',
        )

        const aiQuery = `
            SELECT event, properties.feedback_id, properties.$ai_trace_id
            FROM events
            WHERE event IN ('ai_response_rated', 'ai_response_feedback_comment')
              AND properties.test_run_id = '${testRunId}'
              AND timestamp > now() - INTERVAL 2 HOUR
            LIMIT 100`

        let rows: unknown[][] = []
        await expect
            .poll(
                async () => {
                    rows = (await runHogql(aiQuery)) ?? []
                    const names = new Set(rows.map(r => r[0]))
                    return (
                        names.has('ai_response_rated') &&
                        names.has('ai_response_feedback_comment')
                    )
                },
                { timeout: 90_000, intervals: [2_000, 3_000, 5_000, 8_000] },
            )
            .toBe(true)

        const rated = rows.find(r => r[0] === 'ai_response_rated')
        const commented = rows.find(
            r => r[0] === 'ai_response_feedback_comment',
        )
        // Both legs share one feedback_id, and carry a real trace id.
        expect(rated?.[1]).toBe(commented?.[1])
        const traceId = rated?.[2] as string | undefined
        expect(
            traceId,
            'ai_response_rated must carry a $ai_trace_id',
        ).toBeTruthy()

        // That trace id must resolve to an actual $ai_generation the exporter sent.
        const genQuery = `
            SELECT count()
            FROM events
            WHERE event = '$ai_generation'
              AND properties.$ai_trace_id = '${traceId}'
              AND timestamp > now() - INTERVAL 2 HOUR`
        let genCount = 0
        await expect
            .poll(
                async () => {
                    const gen = await runHogql(genQuery)
                    genCount = Number(gen?.[0]?.[0] ?? 0)
                    return genCount
                },
                { timeout: 90_000, intervals: [2_000, 3_000, 5_000, 8_000] },
            )
            .toBeGreaterThan(0)
    })
})
