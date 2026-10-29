#!/usr/bin/env node

/**
 * The ONE definition of a "docs-only" path, shared by both CI routers.
 *
 *   - main.yml's `Changes` job pipes the PR's changed files to this script's
 *     CLI to decide `code=true|false` (gates Prettier, Oxlint, Knip and
 *     everything chained off Prettier).
 *   - resolve-affected-tests.mjs imports `isDocsOnlyPath` for its LIGHT_DOC
 *     tier (gates the e2e.yml heavy suites).
 *
 * The rule is deliberately narrow: anything under `docs/`, or a markdown file
 * directly in the repo ROOT. Markdown deeper in the tree is NOT docs-only:
 * `pnpm run vocab:check` (main.yml-gated) scans .md under packages/, apps/,
 * scripts/ and .github/, so a broader rule would let a retired-vocabulary
 * token in a package README ship with the heavy gates skipped. (A .changeset
 * entry is simply not covered and fails open.) Widening this rule needs that
 * census redone.
 *
 * Usage (CLI): newline-separated paths on stdin.
 *   exit 0 — input is non-empty and EVERY path is docs-only
 *   exit 1 — at least one path is code, or the input is empty
 * Anything else (a crash) is also non-zero, so the workflow stays fail-open:
 * `code` only becomes false on an explicit exit 0.
 */

import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

/** `docs/` anywhere at the root, or a `*.md` file directly in the repo root. */
export const DOCS_ONLY_PATTERN = /^(docs\/|[^/]+\.md$)/

/** @param {string} path repo-relative, forward-slash path */
export function isDocsOnlyPath(path) {
    return DOCS_ONLY_PATTERN.test(path)
}

/** @param {string[]} paths */
export function isDocsOnlyChange(paths) {
    return paths.length > 0 && paths.every(isDocsOnlyPath)
}

function main() {
    const paths = readFileSync(0, 'utf8')
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
    process.exit(isDocsOnlyChange(paths) ? 0 : 1)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main()
