import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const BUMPS = new Set(['patch', 'minor', 'major', 'none'])
const MAJOR_ALLOW = /^\s*<!--\s*major-allow:\s*\S.*-->\s*$/

// The real parser + package discovery changesets uses. Neither is resolvable
// from the root under pnpm strict, so resolve through @changesets/cli itself.
const require = createRequire(import.meta.url)
const cliDir = dirname(require.resolve('@changesets/cli/package.json'))
const fromCli = id => require(require.resolve(id, { paths: [cliDir] }))
const parseChangeset = fromCli('@changesets/parse').default
const { getPackagesSync } = fromCli('@manypkg/get-packages')

/**
 * Validate one changeset file with the real changesets parser. Pure: returns
 * a list of problem strings. `workspaceNames` / `ignored` are Sets.
 */
export function validateChangeset(text, workspaceNames, ignored = new Set()) {
    let parsed
    try {
        parsed = parseChangeset(text)
    } catch (err) {
        return [`changesets parser rejected the file: ${err.message}`]
    }
    const problems = []
    const seen = new Set()
    for (const { name, type } of parsed.releases) {
        if (seen.has(name)) problems.push(`duplicate package key: ${name}`)
        seen.add(name)
        if (!workspaceNames.has(name))
            problems.push(`unknown workspace package: ${name}`)
        else if (ignored.has(name))
            problems.push(`package is in changeset config "ignore": ${name}`)
        if (!BUMPS.has(type))
            problems.push(`invalid bump "${type}" for ${name}`)
    }
    if (parsed.releases.length > 0 && parsed.summary.trim() === '')
        problems.push('empty summary body')
    if (parsed.releases.some(r => r.type === 'major')) {
        const lines = parsed.summary.split(/\r?\n/).filter(l => l.trim())
        if (!lines.some(l => MAJOR_ALLOW.test(l)))
            problems.push(
                'major bump without a "<!-- major-allow: <reason> -->" marker line',
            )
        else if (lines.every(l => MAJOR_ALLOW.test(l)))
            problems.push('major bump summary contains only the marker')
    }
    return problems
}

const NAMES = new Set(['@useupup/core', '@useupup/react', '@useupup/landing'])
const IGNORED = new Set(['@useupup/landing'])
const check = text => validateChangeset(text, NAMES, IGNORED)

test('accepts a quoted-key patch changeset with a body', () => {
    assert.deepEqual(check('---\n"@useupup/core": patch\n---\n\nFix x.\n'), [])
})

test('accepts single-quoted keys with minor bumps', () => {
    const text =
        "---\n'@useupup/core': minor\n'@useupup/react': minor\n---\nAdd y.\n"
    assert.deepEqual(check(text), [])
})

test('rejects an unquoted @ key that the real YAML parser refuses', () => {
    const problems = check('---\n@useupup/core: minor\n---\nBody\n')
    assert.equal(problems.length, 1)
    assert.match(problems[0], /changesets parser rejected/)
})

test('rejects a missing space after the colon', () => {
    const problems = check('---\n"@useupup/core":patch\n---\nBody\n')
    assert.equal(problems.length, 1)
    assert.match(problems[0], /changesets parser rejected/)
})

test('accepts both shapes of an empty changeset', () => {
    assert.deepEqual(check('---\n---\n'), [])
    assert.deepEqual(check('---\n\n---\n\n\n  '), [])
})

test('accepts a none bump', () => {
    assert.deepEqual(
        check('---\n"@useupup/core": none\n---\nNo release.\n'),
        [],
    )
})

test('rejects a typo in the package name', () => {
    assert.deepEqual(check('---\n"@useupup/cor": minor\n---\nBody\n'), [
        'unknown workspace package: @useupup/cor',
    ])
})

test('rejects a package listed in the changeset config ignore list', () => {
    assert.deepEqual(check('---\n"@useupup/landing": patch\n---\nBody\n'), [
        'package is in changeset config "ignore": @useupup/landing',
    ])
})

test('rejects an invalid bump type', () => {
    const problems = check('---\n"@useupup/core": minr\n---\nBody\n')
    assert.ok(problems.length >= 1, 'a bad bump must produce a problem')
})

test('rejects a duplicate package key', () => {
    const problems = check(
        '---\n"@useupup/core": patch\n"@useupup/core": minor\n---\nB\n',
    )
    assert.ok(problems.length >= 1, 'a duplicate key must produce a problem')
})

test('rejects an empty summary body when there are releases', () => {
    assert.deepEqual(check('---\n"@useupup/core": patch\n---\n\n  \n'), [
        'empty summary body',
    ])
})

test('rejects a file with no frontmatter block', () => {
    const problems = check('"@useupup/core": patch\nBody\n')
    assert.ok(problems.length >= 1, 'missing frontmatter must be a problem')
})

test('parses CRLF line endings identically to LF', () => {
    const lf =
        '---\n"@useupup/core": patch\n"@useupup/react": minor\n---\nBody\n'
    assert.deepEqual(check(lf.replace(/\n/g, '\r\n')), [])
    assert.deepEqual(check(lf.replace(/\n/g, '\r\n').replace('core', 'cor')), [
        'unknown workspace package: @useupup/cor',
    ])
})

test('rejects major without the major-allow marker and accepts it with one', () => {
    const bare = '---\n"@useupup/core": major\n---\nBreaking.\n'
    assert.equal(check(bare).length, 1)
    assert.match(check(bare)[0], /major-allow/)
    const marked = `${bare}<!-- major-allow: approved in #1 -->\n`
    assert.deepEqual(check(marked), [])
})

test('rejects a major whose summary is only the marker', () => {
    const markerOnly =
        '---\n"@useupup/core": major\n---\n<!-- major-allow: reason -->\n'
    assert.deepEqual(check(markerOnly), [
        'major bump summary contains only the marker',
    ])
})

test('every tracked changeset has valid frontmatter', () => {
    const tracked = execFileSync('git', ['ls-files', '.changeset'], {
        cwd: ROOT,
        encoding: 'utf8',
    })
        .split(/\r?\n/)
        .filter(f => f.endsWith('.md') && f !== '.changeset/README.md')
    const config = JSON.parse(
        readFileSync(join(ROOT, '.changeset/config.json'), 'utf8'),
    )
    const names = new Set(
        getPackagesSync(ROOT).packages.map(p => p.packageJson.name),
    )
    const ignored = new Set(config.ignore ?? [])
    assert.ok(names.has('@useupup/core'), 'workspace discovery found core')
    const failures = tracked.flatMap(file =>
        validateChangeset(
            readFileSync(join(ROOT, file), 'utf8'),
            names,
            ignored,
        ).map(p => `${file}: ${p}`),
    )
    assert.deepEqual(failures, [])
})
