import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
    buildReleaseNotes,
    npmPackageUrl,
    compareUrl,
    contributorLine,
} from './release-notes.mjs'

const PKGS = [
    { name: '@upupjs/core', version: '3.1.0' },
    { name: '@upupjs/react', version: '3.1.0' },
]

test('npmPackageUrl pins the version', () => {
    assert.equal(
        npmPackageUrl('@upupjs/core', '3.1.0'),
        'https://www.npmjs.com/package/@upupjs/core/v/3.1.0',
    )
})

test('compareUrl links prev...tag', () => {
    assert.equal(
        compareUrl('DevinoSolutions/upup', 'v3.0.0', 'v3.1.0'),
        'https://github.com/DevinoSolutions/upup/compare/v3.0.0...v3.1.0',
    )
})

test('contributorLine prefers handle, pluralizes commits', () => {
    assert.equal(
        contributorLine({ handle: 'octocat', commits: 1 }),
        '- @octocat — 1 commit',
    )
    assert.equal(
        contributorLine({ name: 'Ada', commits: 3 }),
        '- Ada — 3 commits',
    )
    assert.equal(contributorLine({ name: 'Ada' }), '- Ada')
})

test('buildReleaseNotes lists every package with a version-pinned npm link', () => {
    const md = buildReleaseNotes({ version: '3.1.0', packages: PKGS })
    assert.match(md, /## 📦 Packages/)
    assert.match(md, /All 2 packages are published/)
    for (const p of PKGS) {
        assert.ok(
            md.includes(`[\`${p.name}\`](${npmPackageUrl(p.name, p.version)})`),
            `missing npm link for ${p.name}`,
        )
    }
    // install + footer always present
    assert.match(md, /## 📥 Install/)
    assert.match(md, /npm i @upupjs\/react/)
    assert.match(md, /MIT licensed/)
    assert.ok(md.endsWith('\n'))
})

test('compare link appears only when a previousTag is supplied', () => {
    const withPrev = buildReleaseNotes({
        version: '3.1.0',
        packages: PKGS,
        previousTag: 'v3.0.0',
    })
    assert.match(withPrev, /Full changelog:/)
    assert.match(withPrev, /compare\/v3\.0\.0\.\.\.v3\.1\.0/)

    const noPrev = buildReleaseNotes({ version: '3.1.0', packages: PKGS })
    assert.doesNotMatch(noPrev, /Full changelog:/)
})

test('highlights are prepended verbatim and contributors rendered', () => {
    const md = buildReleaseNotes({
        version: '3.1.0',
        packages: PKGS,
        highlights: '## Highlights\n\n- A brand new thing',
        contributors: [{ handle: 'octocat', commits: 2 }],
    })
    assert.ok(md.startsWith('## Highlights\n\n- A brand new thing'))
    assert.match(md, /## 👥 Contributors/)
    assert.match(md, /- @octocat — 2 commits/)
})

test('throws on missing version or empty package set', () => {
    assert.throws(() => buildReleaseNotes({ packages: PKGS }), /version/)
    assert.throws(
        () => buildReleaseNotes({ version: '3.1.0', packages: [] }),
        /packages/,
    )
})
