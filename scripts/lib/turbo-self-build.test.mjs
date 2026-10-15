import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { findSelfBuildRaces } from './turbo-self-build.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

const rebuildingPackage = {
    name: '@useupup/next',
    scripts: {
        pretest: 'pnpm run build',
        test: 'vitest run',
        'test:coverage': 'vitest run --coverage',
    },
}

test('flags a pretest-rebuilding package whose test tasks skip its own build', () => {
    const turbo = { tasks: { test: { dependsOn: ['^test', '^build'] } } }
    const problems = findSelfBuildRaces(turbo, [rebuildingPackage])
    assert.equal(problems.length, 2)
    assert.match(problems[0], /^@useupup\/next#test must depend on "build"/)
    assert.match(problems[1], /^@useupup\/next#test:coverage must depend/)
})

test('accepts overrides that depend on the package build', () => {
    const turbo = {
        tasks: {
            '@useupup/next#test': { dependsOn: ['^test', '^build', 'build'] },
            '@useupup/next#test:coverage': { dependsOn: ['^build', 'build'] },
        },
    }
    assert.deepEqual(findSelfBuildRaces(turbo, [rebuildingPackage]), [])
})

test('ignores packages without a pretest build', () => {
    const turbo = { tasks: {} }
    const packages = [
        { name: '@useupup/react', scripts: { test: 'vitest run' } },
        {
            name: '@useupup/x',
            scripts: { pretest: 'node lint.mjs', test: 'x' },
        },
    ]
    assert.deepEqual(findSelfBuildRaces(turbo, packages), [])
})

test("the repo's turbo.json orders every pretest rebuild after its build (#402)", () => {
    const turbo = JSON.parse(readFileSync(resolve(root, 'turbo.json'), 'utf8'))
    const packages = ['packages', 'apps'].flatMap(dir =>
        readdirSync(resolve(root, dir))
            .map(name => resolve(root, dir, name, 'package.json'))
            .filter(file => existsSync(file))
            .map(file => JSON.parse(readFileSync(file, 'utf8'))),
    )
    assert.deepEqual(findSelfBuildRaces(turbo, packages), [])
})
