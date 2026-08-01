import { randomBytes } from 'node:crypto'
import { join } from 'node:path'

// The per-run correlation id + small cross-spec artifact store live in
// test-results/ (gitignored). global-setup writes the run id ONCE (single
// writer, before any worker starts) so every spec — and the serial ingestion
// spec that runs last — reads the same value.

export const RUN_CONTEXT_FILE = join(
    process.cwd(),
    'test-results',
    'landing-e2e-run-context.json',
)

export const ARTIFACTS_FILE = join(
    process.cwd(),
    'test-results',
    'landing-e2e-artifacts.json',
)

/**
 * A run id shaped `e2e:<timestamp>-<random>` — matches the [A-Za-z0-9:_-]+
 * charset the support schema / PostHog property filters accept.
 */
export function makeTestRunId(): string {
    return `e2e:${Date.now()}-${randomBytes(4).toString('hex')}`
}
