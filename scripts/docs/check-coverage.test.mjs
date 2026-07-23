import assert from 'node:assert/strict'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { CANONICAL_FILES, checkCoverage } from './check-coverage.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const fixture = (...p) => resolve(HERE, '__fixtures__', 'topic-corpora', ...p)

const COMPLETE = fixture('complete') // one topic with all seven files
const PARTIAL = fixture('partial') // one topic missing vue.vue + svelte.svelte

test('a topic carrying all seven canonical files passes with no failures', () => {
    const { failures, counts } = checkCoverage({
        snippetsDir: COMPLETE,
        exceptions: [],
    })
    assert.deepEqual(failures, [], JSON.stringify(failures, null, 2))
    assert.equal(counts.topics, 1)
    assert.equal(counts.filesPresent, CANONICAL_FILES.length)
})

test('a missing or emptied registry fails EMPTY_REGISTRY instead of passing vacuously', () => {
    const { failures } = checkCoverage({
        snippetsDir: fixture('does-not-exist'),
        exceptions: [],
    })
    assert.equal(failures.length, 1)
    assert.equal(failures[0].kind, 'EMPTY_REGISTRY')
})

test('a topic missing frameworks reports one MISSING failure per absent file', () => {
    const { failures } = checkCoverage({ snippetsDir: PARTIAL, exceptions: [] })
    const missing = failures.filter(f => f.kind === 'MISSING')
    assert.deepEqual(missing.map(f => f.file).toSorted(), [
        'svelte.svelte',
        'vue.vue',
    ])
})

test('a valid exception suppresses exactly the missing file it names', () => {
    const { failures } = checkCoverage({
        snippetsDir: PARTIAL,
        exceptions: [
            { topic: 'half', file: 'vue.vue', reason: 'no vue port yet' },
        ],
    })
    const missing = failures.filter(f => f.kind === 'MISSING')
    assert.deepEqual(
        missing.map(f => f.file),
        ['svelte.svelte'],
    )
})

test('an exception for a topic that no longer exists is flagged STALE_EXCEPTION', () => {
    const { failures } = checkCoverage({
        snippetsDir: PARTIAL,
        exceptions: [{ topic: 'ghost-topic', file: 'vue.vue', reason: 'gone' }],
    })
    const stale = failures.find(f => f.kind === 'STALE_EXCEPTION')
    assert.ok(stale, 'expected a STALE_EXCEPTION')
    assert.match(stale.reason, /no longer exists/)
})

test('an exception whose file now exists self-liquidates as STALE_EXCEPTION', () => {
    const { failures } = checkCoverage({
        snippetsDir: COMPLETE,
        exceptions: [
            { topic: 'getting-started', file: 'react.tsx', reason: 'stale' },
        ],
    })
    const stale = failures.find(f => f.kind === 'STALE_EXCEPTION')
    assert.ok(stale, 'expected a STALE_EXCEPTION')
    assert.match(stale.reason, /now ships/)
})

test('an exception naming a non-canonical file is flagged INVALID_EXCEPTION', () => {
    const { failures } = checkCoverage({
        snippetsDir: PARTIAL,
        exceptions: [{ topic: 'half', file: 'solid.tsx', reason: 'typo' }],
    })
    const invalid = failures.find(f => f.kind === 'INVALID_EXCEPTION')
    assert.ok(invalid, 'expected an INVALID_EXCEPTION')
    assert.match(invalid.reason, /not one of the seven canonical/)
})
