import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
    DOCS_ONLY_PATTERN,
    isDocsOnlyChange,
    isDocsOnlyPath,
} from './docs-only.mjs'
import { IMPACT_RULES, resolveFile } from './resolve-affected-tests.mjs'

const SCRIPT = fileURLToPath(new URL('./docs-only.mjs', import.meta.url))
const MAIN_YML = fileURLToPath(
    new URL('../../.github/workflows/main.yml', import.meta.url),
)

/** path -> is it docs-only? The pinned definition both routers must obey. */
const FIXTURES = [
    ['docs/a.md', true],
    ['docs/diagrams/flow.png', true],
    ['README.md', true],
    ['CLAUDE.md', true],
    ['.changeset/x.md', false],
    ['packages/core/README.md', false],
    ['apps/landing/content/docs/x.mdx', false],
    ['apps/landing/content/docs/x.md', false],
    ['scripts/notes.md', false],
    ['.github/pull_request_template.md', false],
    ['packages/core/src/a.ts', false],
    ['package.json', false],
    ['README.MD', false],
]

for (const [path, expected] of FIXTURES) {
    test(`isDocsOnlyPath classifies ${path} as ${expected ? 'docs-only' : 'code'}`, () => {
        assert.equal(isDocsOnlyPath(path), expected)
    })
}

test('a change set is docs-only only when it is non-empty and every path is docs-only', () => {
    assert.equal(isDocsOnlyChange(['docs/a.md', 'README.md']), true)
    assert.equal(
        isDocsOnlyChange(['docs/a.md', 'packages/core/src/a.ts']),
        false,
    )
    assert.equal(isDocsOnlyChange([]), false)
})

test('the resolver LIGHT_DOC tier is exactly one rule and it is the shared isDocsOnlyPath predicate', () => {
    const lightDocRules = IMPACT_RULES.filter(r => r.tier === 'light-doc')
    assert.equal(lightDocRules.length, 1)
    assert.equal(lightDocRules[0].test, isDocsOnlyPath)
})

for (const [path, expected] of FIXTURES) {
    test(`the resolver puts ${path} in the light-doc tier exactly when it is docs-only (${expected})`, () => {
        // No fixture is universal, so the tier outcome is decided by the
        // docs-only predicate alone; a drifted resolver rule flips this.
        assert.equal(resolveFile(path).tier === 'light-doc', expected)
    })
}

/** Run the CLI exactly as main.yml does: paths on stdin, verdict in the exit code. */
function classify(paths) {
    return spawnSync(process.execPath, [SCRIPT], {
        input: paths.join('\n') + '\n',
        encoding: 'utf8',
    })
}

test('the CLI exits 0 for an all-docs diff so main.yml sets code=false', () => {
    assert.equal(classify(['docs/a.md', 'README.md']).status, 0)
})

test('the CLI exits 1 when any path is code so main.yml keeps code=true', () => {
    assert.equal(classify(['docs/a.md', '.changeset/x.md']).status, 1)
})

test('the CLI exits 1 on empty input so an unreadable diff fails open to code=true', () => {
    assert.equal(classify([]).status, 1)
})

test('main.yml classifies docs-only through scripts/ci/docs-only.mjs and carries no inline docs regex', () => {
    const workflow = readFileSync(MAIN_YML, 'utf8')
    const stepStart = workflow.indexOf('- name: Classify the diff')
    assert.ok(stepStart > 0, 'Classify the diff step not found in main.yml')
    const step = workflow.slice(
        stepStart,
        workflow.indexOf('Prettier-check:', stepStart),
    )
    assert.match(step, /node scripts\/ci\/docs-only\.mjs/)
    assert.doesNotMatch(
        step,
        /grep/,
        'an inline grep would be a second definition',
    )
    assert.doesNotMatch(
        step,
        /\\\.md/,
        'an inline .md regex would be a second definition',
    )
})

test('the shared pattern is anchored so a nested docs directory is not docs-only', () => {
    assert.equal(DOCS_ONLY_PATTERN.test('packages/core/docs/a.md'), false)
    assert.equal(DOCS_ONLY_PATTERN.test('docs/a.md'), true)
})
