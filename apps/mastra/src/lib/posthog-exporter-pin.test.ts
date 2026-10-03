import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * `mastra build` generates .mastra/output/package.json from this package's
 * dependency ranges and installs from scratch, ignoring the workspace lockfile.
 * A caret range therefore floats to the newest @mastra/posthog at build time.
 * 1.3.15 switched the exporter to posthog-node's captureAi(), which POSTs to
 * /i/v0/ai/batch/ — a route our self-hosted PostHog answers with 404, so every
 * $ai_generation was silently dropped (nightly thumbs ingestion red 2026-09-30
 * onward). 1.3.10 uses the plain capture path. Keep it an EXACT pin until the
 * PostHog instance serves the AI route.
 */
describe('@mastra/posthog pin', () => {
    it('is an exact version, never a floating range', () => {
        const pkg = JSON.parse(
            readFileSync(
                new URL('../../package.json', import.meta.url),
                'utf8',
            ),
        ) as { dependencies: Record<string, string> }
        expect(pkg.dependencies['@mastra/posthog']).toBe('1.3.10')
    })
})
