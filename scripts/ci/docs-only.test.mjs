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

test('the resolver carries the shared isDocsOnlyPath predicate itself as its docs-only rule, not a copy', () => {
    const rule = IMPACT_RULES.find(r => r.name === 'docs-only')
    assert.equal(rule?.tier, 'light-doc')
    assert.equal(rule.test, isDocsOnlyPath)
})

for (const [path, expected] of FIXTURES) {
    if (expected) {
        test(`the resolver puts docs-only path ${path} in the light-doc tier with no suites`, () => {
            const resolved = resolveFile(path)
            assert.equal(resolved.tier, 'light-doc')
            assert.deepEqual(resolved.suites, [])
        })
    }
}

test('the resolver is broader than docs-only for markdown only, so non-markdown fixtures outside docs are never light-doc', () => {
    for (const [path, docsOnly] of FIXTURES) {
        if (docsOnly || /\.md$/i.test(path)) continue
        assert.notEqual(resolveFile(path).tier, 'light-doc', path)
    }
})

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

/** The `Changes` job of main.yml, from its key to the next job, LF-normalized. */
function changesJob() {
    const workflow = readFileSync(MAIN_YML, 'utf8').split('\r\n').join('\n')
    const start = workflow.indexOf('\n    Changes:\n')
    const end = workflow.indexOf('\n    Prettier-check:\n')
    assert.ok(start > 0 && end > start, 'Changes job not found in main.yml')
    return workflow.slice(start, end)
}

/** The dedented body of every `run: |` block in a job. */
function runBlocks(job) {
    const blocks = []
    const lines = job.split('\n')
    for (let i = 0; i < lines.length; i++) {
        const header = /^(\s*)run: \|\s*$/.exec(lines[i])
        if (!header) continue
        const bodyIndent = header[1] + '    '
        const body = []
        for (let j = i + 1; j < lines.length; j++) {
            if (lines[j].trim() !== '' && !lines[j].startsWith(bodyIndent))
                break
            body.push(lines[j].slice(bodyIndent.length))
        }
        blocks.push(body.join('\n').trimEnd())
    }
    return blocks
}

const EXPECTED_CLASSIFY_RUN = [
    'code=true',
    'if [ "$EVENT" = "pull_request" ]; then',
    '  if files=$(git diff --no-renames --name-only "$BASE...$HEAD") && [ -n "$files" ]; then',
    '    if printf \'%s\\n\' "$files" | node scripts/ci/docs-only.mjs; then',
    '      code=false',
    '    fi',
    '  fi',
    'fi',
    'echo "code=$code" >> "$GITHUB_OUTPUT"',
    'echo "code=$code"',
].join('\n')

test('main.yml Changes job has exactly one run step and its classification is the exact docs-only.mjs invocation', () => {
    const blocks = runBlocks(changesJob())
    assert.equal(blocks.length, 1, 'Changes must keep a single run step')
    assert.equal(blocks[0], EXPECTED_CLASSIFY_RUN)
})

test('main.yml Changes job has no docs/ literal and no markdown pattern outside comments so no second copy of the rule can sit beside the CLI call', () => {
    const code = changesJob()
        .split('\n')
        .filter(line => !line.trim().startsWith('#'))
        .join('\n')
    assert.doesNotMatch(code, /docs\//)
    assert.doesNotMatch(code, /\.md\b/)
    assert.doesNotMatch(code, /\\\./)
    assert.doesNotMatch(code, /\b(grep|awk|sed)\b/)
})

test('the shared pattern is anchored so a nested docs directory is not docs-only', () => {
    assert.equal(DOCS_ONLY_PATTERN.exec('packages/core/docs/a.md'), null)
    assert.equal(DOCS_ONLY_PATTERN.exec('docs/a.md')?.index, 0)
})
