// scripts/drive-sandbox/seed-escape-twin.test.mjs
//
// Holds `escapeGDriveQueryValue` in seed.mjs to `escapeDriveQueryValue` in
// packages/core/src/drives/query-escape.ts.
//
// The seed script keeps its own copy on purpose. It is a standalone ops script
// run as `node scripts/drive-sandbox/seed.mjs`, and importing the core function
// would mean adding `@useupup/core` as a root dependency and refusing to run
// until the package had been built — a build step to seed a sandbox account.
// The copy is one expression and the trade is worth it.
//
// What is not acceptable is the copy drifting silently. A Drive query literal
// is single-quoted, so an id carrying a quote closes it early; getting the
// BACKSLASH-BEFORE-QUOTE order wrong is the classic way to write an escaper
// that looks correct and escapes nothing.
//
// The guarantee is split in two, and neither half is enough alone:
//
//   1. `packages/core/tests/drive-query-escape.test.ts` pins what the core
//      function DOES, over seven cases including the ordering one.
//   2. This file pins that the seed copy is the SAME EXPRESSION as the one
//      those cases cover, so the behaviour carries across without this test
//      having to re-derive it.
//
// Comparing source rather than running it is deliberate: seed.mjs calls main()
// at module scope so it cannot be imported, the core file is TypeScript so it
// cannot be required from a plain node test, and evaluating extracted source
// would mean compiling a string — a bad habit to model in a repo's own tests
// even when the string comes from a tracked file.

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = resolve(HERE, '..', '..')

const SEED = resolve(REPO, 'scripts/drive-sandbox/seed.mjs')
const CORE = resolve(REPO, 'packages/core/src/drives/query-escape.ts')

/**
 * The body of a one-expression `return`, with the parameter renamed to a fixed
 * token and runs of whitespace collapsed — so the two copies compare equal
 * despite different parameter names, indentation or line breaks.
 *
 * Deliberately narrow. It matches a single-expression body and nothing else, so
 * a rewrite into a shape this cannot read fails loudly here rather than being
 * quietly skipped.
 */
function normalisedBody(file, name) {
    const src = readFileSync(file, 'utf8')
    const pattern = new RegExp(
        `function ${name}\\s*\\(\\s*(\\w+)[^)]*\\)[^{]*\\{\\s*return ([\\s\\S]*?)\\n\\}`,
        'm',
    )
    const match = pattern.exec(src)
    assert.ok(
        match,
        `${name} not found in ${file} in the single-return shape this test reads. ` +
            'If it was rewritten, update this test rather than deleting it — the ' +
            'two implementations must stay identical.',
    )
    const [, param, body] = match
    return body
        .trim()
        .replace(new RegExp(`\\b${param}\\b`, 'g'), 'VALUE')
        .replace(/\s+/g, ' ')
}

test('the seed copy is the same expression as the core escaper', () => {
    assert.equal(
        normalisedBody(SEED, 'escapeGDriveQueryValue'),
        normalisedBody(CORE, 'escapeDriveQueryValue'),
        'the seed copy has drifted from packages/core/src/drives/query-escape.ts — ' +
            'change both, or make the script import the core one',
    )
})

test('that shared expression escapes the backslash before the quote', () => {
    // The ordering is the whole correctness argument, so it is asserted on the
    // source directly and not left implied by the equality above: escaping the
    // quote first leaves the backslash it introduces to be doubled by the
    // second pass, which turns the escape back into a literal backslash
    // followed by an unescaped quote — closing the literal it was meant to
    // protect. `packages/core/tests/drive-query-escape.test.ts` covers what
    // that means for real values.
    const body = normalisedBody(CORE, 'escapeDriveQueryValue')
    const backslashPass = body.indexOf('replace(/\\\\/g')
    const quotePass = body.indexOf("replace(/'/g")
    assert.notEqual(backslashPass, -1, 'no backslash-escaping pass found')
    assert.notEqual(quotePass, -1, 'no quote-escaping pass found')
    assert.ok(
        backslashPass < quotePass,
        'backslashes must be escaped BEFORE quotes',
    )
})

test('the seed script still points a reader at the core implementation', () => {
    assert.match(
        readFileSync(SEED, 'utf8'),
        /packages\/core\/src\/drives\/query-escape\.ts/,
        'the comment above the seed copy must name the file it mirrors',
    )
    // And that file must exist, so the pointer cannot rot into a dead path.
    readFileSync(CORE, 'utf8')
})
