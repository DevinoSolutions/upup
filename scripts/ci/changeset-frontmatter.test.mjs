import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const BUMPS = new Set(['patch', 'minor', 'major'])
const MAJOR_ALLOW = /^<!--\s*major-allow:\s*\S.*-->\s*$/m

/**
 * Validate one changeset file. Pure: returns a list of problem strings.
 * `workspaceNames` / `ignored` are Sets of package names.
 */
export function validateChangeset(text, workspaceNames, ignored = new Set()) {
    const problems = []
    const src = text.replace(/\r\n/g, '\n')
    const match = /^---\n([\s\S]*?)\n?---\n?([\s\S]*)$/.exec(src)
    if (!match) return ['missing or unterminated frontmatter block']
    const [, front, body] = match
    const seen = new Set()
    let entries = 0
    let hasMajor = false
    for (const raw of front.split('\n')) {
        const line = raw.trim()
        if (!line) continue
        const kv =
            /^(?:"([^"]+)"|'([^']+)'|([^\s:'"]+(?:\/[^\s:'"]+)?))\s*:\s*(\S+)$/.exec(
                line,
            )
        if (!kv) {
            problems.push(`unparseable frontmatter line: ${line}`)
            continue
        }
        const name = kv[1] ?? kv[2] ?? kv[3]
        const bump = kv[4]
        entries++
        if (seen.has(name)) problems.push(`duplicate package key: ${name}`)
        seen.add(name)
        if (!workspaceNames.has(name))
            problems.push(`unknown workspace package: ${name}`)
        else if (ignored.has(name))
            problems.push(`package is in changeset config "ignore": ${name}`)
        if (!BUMPS.has(bump))
            problems.push(`invalid bump "${bump}" for ${name}`)
        if (bump === 'major') hasMajor = true
    }
    if (entries === 0 && problems.length === 0)
        problems.push('frontmatter has no package entries')
    if (body.trim() === '') problems.push('empty summary body')
    if (hasMajor && !MAJOR_ALLOW.test(body))
        problems.push(
            'major bump without a "<!-- major-allow: <reason> -->" marker line',
        )
    return problems
}

function workspaceNamesFromRepo() {
    const yaml = readFileSync(join(ROOT, 'pnpm-workspace.yaml'), 'utf8')
    const globs = [...yaml.matchAll(/^\s*-\s*['"]?([^'"\s#]+)['"]?/gm)]
        .map(m => m[1])
        .filter(g => !g.startsWith('!'))
    const names = new Set()
    for (const glob of globs) {
        const dirs = glob.endsWith('/*')
            ? readdirSync(join(ROOT, glob.slice(0, -2)), {
                  withFileTypes: true,
              })
                  .filter(d => d.isDirectory())
                  .map(d => `${glob.slice(0, -2)}/${d.name}`)
            : [glob]
        for (const dir of dirs) {
            const pkg = join(ROOT, dir, 'package.json')
            if (existsSync(pkg))
                names.add(JSON.parse(readFileSync(pkg, 'utf8')).name)
        }
    }
    return names
}

const NAMES = new Set(['@useupup/core', '@useupup/react', '@useupup/landing'])
const IGNORED = new Set(['@useupup/landing'])
const check = text => validateChangeset(text, NAMES, IGNORED)

test('accepts a quoted-key patch changeset with a body', () => {
    assert.deepEqual(check('---\n"@useupup/core": patch\n---\n\nFix x.\n'), [])
})

test('accepts unquoted and single-quoted keys with minor bumps', () => {
    const text =
        "---\n'@useupup/core': minor\n@useupup/react: minor\n---\nAdd y.\n"
    assert.deepEqual(check(text), [])
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
    assert.deepEqual(check('---\n"@useupup/core": minr\n---\nBody\n'), [
        'invalid bump "minr" for @useupup/core',
    ])
})

test('rejects a duplicate package key', () => {
    assert.deepEqual(
        check('---\n"@useupup/core": patch\n"@useupup/core": minor\n---\nB\n'),
        ['duplicate package key: @useupup/core'],
    )
})

test('rejects an empty summary body', () => {
    assert.deepEqual(check('---\n"@useupup/core": patch\n---\n\n  \n'), [
        'empty summary body',
    ])
})

test('rejects a file with no frontmatter block', () => {
    assert.deepEqual(check('"@useupup/core": patch\nBody\n'), [
        'missing or unterminated frontmatter block',
    ])
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
    const names = workspaceNamesFromRepo()
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
