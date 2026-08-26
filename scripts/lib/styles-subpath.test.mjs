import { test } from 'node:test'
import assert from 'node:assert/strict'
import { checkStylesSubpath } from './styles-subpath.mjs'

const VALID_DECLARATION = '// generated\nexport {}\n'

function validPackage(overrides = {}) {
    return {
        exports: {
            '.': { types: './dist/index.d.ts', import: './dist/index.js' },
            './styles': {
                types: './dist/styles.d.ts',
                default: './dist/tailwind-prefixed.css',
            },
        },
        typesVersions: { '*': { styles: ['dist/styles.d.ts'] } },
        ...overrides,
    }
}

test('accepts the shipped ./styles contract', () => {
    assert.doesNotThrow(() =>
        checkStylesSubpath('@upupjs/react', validPackage(), VALID_DECLARATION),
    )
})

test('rejects a bare-string ./styles subpath (the #357 regression)', () => {
    const pkg = validPackage()
    pkg.exports['./styles'] = './dist/tailwind-prefixed.css'
    assert.throws(
        () => checkStylesSubpath('@upupjs/react', pkg, VALID_DECLARATION),
        /must be a conditions object/,
    )
})

test('rejects a ./styles subpath whose types condition was dropped', () => {
    const pkg = validPackage()
    pkg.exports['./styles'] = { default: './dist/tailwind-prefixed.css' }
    assert.throws(
        () => checkStylesSubpath('@upupjs/vue', pkg, VALID_DECLARATION),
        /types condition must come first/,
    )
})

test('rejects a moved runtime target so the CSS path cannot drift', () => {
    const pkg = validPackage()
    pkg.exports['./styles'].default = './dist/styles.css'
    assert.throws(
        () => checkStylesSubpath('@upupjs/svelte', pkg, VALID_DECLARATION),
        /must stay \.\/dist\/tailwind-prefixed\.css/,
    )
})

test('rejects a missing typesVersions fallback (node10 consumers)', () => {
    assert.throws(
        () =>
            checkStylesSubpath(
                '@upupjs/angular',
                validPackage({ typesVersions: undefined }),
                VALID_DECLARATION,
            ),
        /typesVersions\["\*"\]\.styles/,
    )
})

test('rejects a tarball that ships no styles.d.ts', () => {
    assert.throws(
        () => checkStylesSubpath('@upupjs/preact', validPackage(), undefined),
        /dist\/styles\.d\.ts is missing/,
    )
})

test('rejects a styles.d.ts that is a global script rather than a module', () => {
    assert.throws(
        () =>
            checkStylesSubpath(
                '@upupjs/next',
                validPackage(),
                '// intentionally empty\n',
            ),
        /must declare an empty module/,
    )
})
