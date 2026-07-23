import assert from 'node:assert/strict'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { checkDocsLinks, slug } from './check-links.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const fixture = (...p) => resolve(HERE, '__fixtures__', ...p)

const VALID = {
    contentDir: fixture('valid', 'content'),
    nextConfigPath: fixture('valid', 'redirects.config.txt'),
}
const BROKEN = {
    contentDir: fixture('broken', 'content'),
    nextConfigPath: fixture('broken', 'redirects.config.txt'),
}

test('slugger reproduces fumadocs heading ids for special-character headings', () => {
    // Pinned against the actual built docs output (rehype-slug / github-slugger
    // v2): `## Mode (light / dark / system)` renders id="mode-light--dark--system".
    assert.equal(
        slug('Mode (light / dark / system)'),
        'mode-light--dark--system',
    )
    assert.equal(slug('maxRetries'), 'maxretries')
    assert.equal(
        slug('Headless: UpupThemeProvider'),
        'headless-upupthemeprovider',
    )
})

test('a corpus of valid links, anchors, and redirects passes with no failures', () => {
    const { failures, counts } = checkDocsLinks(VALID)
    assert.deepEqual(failures, [], JSON.stringify(failures, null, 2))
    assert.equal(counts.pages, 2)
    assert.ok(
        counts.linksChecked >= 3,
        'expected the fixture links to be walked',
    )
    assert.ok(
        counts.anchorsChecked >= 2,
        'expected the fixture anchors to be walked',
    )
    assert.equal(counts.redirectsChecked, 1)
})

test('a link to a nonexistent page is reported as a LINK failure', () => {
    const { failures } = checkDocsLinks(BROKEN)
    const link = failures.find(f => f.kind === 'LINK')
    assert.ok(link, 'expected a LINK failure')
    assert.match(link.reason, /\/docs\/missing does not exist/)
})

test('a fragment pointing at a missing heading is reported as an ANCHOR failure', () => {
    const { failures } = checkDocsLinks(BROKEN)
    const anchor = failures.find(f => f.kind === 'ANCHOR')
    assert.ok(anchor, 'expected an ANCHOR failure')
    assert.match(anchor.reason, /#nope is not a heading on \/docs\/guide/)
})

test('a relative link is reported as a RELATIVE failure and told to become absolute', () => {
    const { failures } = checkDocsLinks(BROKEN)
    const rel = failures.find(f => f.kind === 'RELATIVE')
    assert.ok(rel, 'expected a RELATIVE failure')
    assert.match(rel.reason, /absolute \/docs\/\.\.\. link/)
})

test('a redirect target that resolves to no page is reported as a REDIRECT failure', () => {
    const { failures } = checkDocsLinks(BROKEN)
    const redirect = failures.find(f => f.kind === 'REDIRECT')
    assert.ok(redirect, 'expected a REDIRECT failure')
    assert.match(
        redirect.reason,
        /\/docs\/does-not-exist\/ resolves to no page/,
    )
})
