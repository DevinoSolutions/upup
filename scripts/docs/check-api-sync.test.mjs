// Self-test for the docs API-surface sync gate. Drives the pure checkSync()
// with fixtures so every gate rule is proven to fire on the rot it exists to
// catch and stay silent on a clean surface, and pins the two extractors
// (pin-array parse, contracts type-member parse). Run via `pnpm run
// test:scripts` (node:test).

import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
    checkSync,
    extractPinnedArrays,
    extractTypeMembers,
} from './check-api-sync.mjs'

const kindsOf = failures => failures.map(f => f.kind).sort()

// A clean fixture: one member mapped to a page that exists and mentions it,
// one member honestly excepted. This must produce zero findings.
const cleanArgs = () => ({
    surface: {
        '@upupjs/react': ['UpupUploader', 'useIsClient'],
    },
    map: {
        '@upupjs/react': { UpupUploader: 'docs/react.mdx' },
    },
    exceptions: {
        '@upupjs/react': { useIsClient: 'undocumented: headless hook' },
    },
    pageExists: page => page === 'docs/react.mdx',
    pageContains: (page, member) =>
        page === 'docs/react.mdx' && member === 'UpupUploader',
    docsMention: () => false,
})

test('a fully mapped-or-excepted surface with present docs yields no findings', () => {
    assert.deepEqual(checkSync(cleanArgs()), [])
})

test('a public member that is neither mapped nor excepted fails as unmapped', () => {
    const args = cleanArgs()
    args.surface['@upupjs/react'].push('BrandNewExport')
    const failures = checkSync(args)
    assert.deepEqual(kindsOf(failures), ['unmapped'])
    assert.equal(failures[0].member, 'BrandNewExport')
})

test('a map entry naming a member absent from the surface fails as a ghost mapping', () => {
    const args = cleanArgs()
    args.map['@upupjs/react'].RemovedExport = 'docs/react.mdx'
    const failures = checkSync(args)
    assert.deepEqual(kindsOf(failures), ['ghost-map'])
    assert.equal(failures[0].member, 'RemovedExport')
})

test('an exception whose member left the surface fails as a stale exception', () => {
    const args = cleanArgs()
    args.exceptions['@upupjs/react'].GoneExport = 'undocumented: removed later'
    const failures = checkSync(args)
    assert.deepEqual(kindsOf(failures), ['stale-exception'])
    assert.equal(failures[0].member, 'GoneExport')
})

test('a mapped page that no longer mentions the member fails as page-missing-member', () => {
    const args = cleanArgs()
    args.pageContains = () => false
    const failures = checkSync(args)
    assert.deepEqual(kindsOf(failures), ['page-missing-member'])
    assert.equal(failures[0].member, 'UpupUploader')
})

test('a mapped page that does not exist fails as missing-page', () => {
    const args = cleanArgs()
    args.pageExists = () => false
    const failures = checkSync(args)
    assert.deepEqual(kindsOf(failures), ['missing-page'])
})

test('a member listed in both the map and the exceptions fails as double-listed', () => {
    const args = cleanArgs()
    args.exceptions['@upupjs/react'].UpupUploader =
        'undocumented: contradiction'
    const failures = checkSync(args)
    assert.ok(kindsOf(failures).includes('double-listed'))
})

test('an exception liquidates once its distinctive member becomes documented', () => {
    const args = cleanArgs()
    args.docsMention = member => member === 'useIsClient'
    const failures = checkSync(args)
    assert.deepEqual(kindsOf(failures), ['stale-exception'])
    assert.equal(failures[0].member, 'useIsClient')
})

test('extractPinnedArrays parses a sorted-chained EXPECTED array and flags react mirrors', () => {
    const pinText = [
        "const EXPECTED_PUBLIC_VALUE_EXPORTS = ['b', 'a', 'c'].sort()",
        'export {}',
    ].join('\n')
    const { arrays, mirrorsReact } = extractPinnedArrays(pinText, 'pin.ts')
    assert.deepEqual(arrays.EXPECTED_PUBLIC_VALUE_EXPORTS, ['b', 'a', 'c'])
    assert.equal(mirrorsReact, false)

    const mirrorText = "import * as reactPkg from '@upupjs/react'\nexport {}\n"
    assert.equal(extractPinnedArrays(mirrorText, 'm.ts').mirrorsReact, true)
})

test('extractTypeMembers enumerates interface keys including quoted event names', () => {
    const src = [
        'export interface CoreEventsFixture {',
        "    'state-change': { status: string }",
        '    retry: { fileId: string }',
        '}',
    ].join('\n')
    assert.deepEqual(extractTypeMembers(src, 'CoreEventsFixture', 'e.ts'), [
        'state-change',
        'retry',
    ])
})
