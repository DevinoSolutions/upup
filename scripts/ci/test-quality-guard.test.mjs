// Self-test for the test-quality guard: every rule must fire on the rot it
// exists to catch and stay silent on the legitimate idioms the 2026-07-09
// census found in this repo (conditional Playwright skips, route-mock
// latency callbacks, markers). Run via `pnpm run test:scripts`.

import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
    analyzeRegenGuards,
    analyzeTestFile,
    analyzeTestFileName,
    analyzeWorkflow,
    KNOWN_EXCEPTIONS,
    SELF_TEST_FIXTURE_FILES,
} from './test-quality-guard.mjs'

const UNIT = 'packages/example/tests/example-behavior.test.ts'
const E2E = 'apps/e2e-test/e2e/example-flow.spec.ts'
const INTEGRATION =
    'packages/example/tests/integration/example-behavior.integration.test.ts'

const rulesOf = violations => violations.map(v => v.rule)

test('a committed describe/it/test .only is reported so focused runs cannot narrow CI', () => {
    const text = [
        "describe.only('uploads', () => {})",
        "it.only('uploads one file', () => {})",
        "test.describe.only('suite', () => {})",
    ].join('\n')
    assert.deepEqual(rulesOf(analyzeTestFile(UNIT, text)), [
        'only',
        'only',
        'only',
    ])
})

test('a skipped test without a skip-allow marker is reported as a silent skip', () => {
    const text = "it.skip('uploads one file', () => {})"
    assert.deepEqual(rulesOf(analyzeTestFile(UNIT, text)), ['silent-skip'])
})

test('a skipped test carrying skip-allow with a future expiry passes, and the same marker expired fails', () => {
    const text = [
        '// skip-allow(owner=amin reason=flaky-upstream-fix-pending until=2027-01-01)',
        "it.skip('uploads one file', () => {})",
    ].join('\n')
    assert.deepEqual(
        analyzeTestFile(UNIT, text, { today: new Date('2026-07-09') }),
        [],
    )
    const expired = analyzeTestFile(UNIT, text, {
        today: new Date('2027-06-01'),
    })
    assert.deepEqual(rulesOf(expired), ['expired-skip'])
})

test("Playwright's conditional test.skip(expr, reason) is not a disabled test and passes", () => {
    const text =
        "test.skip(testInfo.project.name !== 'preact', 'preact-only: island host')"
    assert.deepEqual(analyzeTestFile(E2E, text), [])
})

test('an argument-less test.skip() inside a spec body is still a silent skip', () => {
    const text = 'test.skip()'
    assert.deepEqual(rulesOf(analyzeTestFile(E2E, text)), ['silent-skip'])
})

test('it.todo and xit are reported because pending markers rot silently', () => {
    const text = ["it.todo('write this')", "xit('old test', () => {})"].join(
        '\n',
    )
    assert.deepEqual(rulesOf(analyzeTestFile(UNIT, text)), [
        'silent-skip',
        'silent-skip',
    ])
})

test('tautological assertions like expect(true).toBe(true) are reported as fake verification', () => {
    const text = [
        'expect(true).toBe(true)',
        'expect(1).toBe(1)',
        'expect(true).toBeTruthy()',
        'expect(false).toBeFalsy()',
    ].join('\n')
    assert.deepEqual(rulesOf(analyzeTestFile(UNIT, text)), [
        'tautology',
        'tautology',
        'tautology',
        'tautology',
    ])
})

test('a real assertion comparing two expressions is never mistaken for a tautology', () => {
    const text = [
        'expect(result.ok).toBe(true)',
        'expect(count).toBe(1)',
        'expect(flag).toBeTruthy()',
    ].join('\n')
    assert.deepEqual(analyzeTestFile(UNIT, text), [])
})

test('blocklisted and single-word test titles are reported; behavior-driven titles pass', () => {
    const vague = [
        "it('works', () => {})",
        "test('renders', () => {})",
        "it('handles error', () => {})",
    ].join('\n')
    assert.deepEqual(rulesOf(analyzeTestFile(UNIT, vague)), [
        'vague-name',
        'vague-name',
        'vague-name',
    ])
    const good =
        "it('oversized direct uploads are rejected when the body exceeds the signed content length', () => {})"
    assert.deepEqual(analyzeTestFile(UNIT, good), [])
})

test('parameterized %s titles are exempt from the single-word rule because the runner expands them', () => {
    const text = "it.each(cases)('%s', c => {})"
    assert.deepEqual(analyzeTestFile(UNIT, text), [])
})

test('a Playwright waitForTimeout without sleep-allow is reported; with the marker it passes', () => {
    const bare = 'await page.waitForTimeout(500)'
    assert.deepEqual(rulesOf(analyzeTestFile(E2E, bare)), ['sleep'])
    const marked = [
        '// sleep-allow(media autoplay must settle before geometry is measured)',
        'await page.waitForTimeout(500)',
    ].join('\n')
    assert.deepEqual(analyzeTestFile(E2E, marked), [])
})

test('the awaited promise-sleep idiom counts as a sleep, but a route-mock setTimeout callback does not', () => {
    const sleep = 'await new Promise(r => setTimeout(r, 2000))'
    assert.deepEqual(rulesOf(analyzeTestFile(E2E, sleep)), ['sleep'])
    const routeMock = 'setTimeout(() => route.fulfill({ status: 200 }), 2000)'
    assert.deepEqual(analyzeTestFile(E2E, routeMock), [])
})

test('sleeps outside Playwright directories are not in scope for the sleep rule', () => {
    const text = 'await new Promise(r => setTimeout(r, 50))'
    assert.deepEqual(analyzeTestFile(UNIT, text), [])
})

test('vi.mock inside an integration test without boundary-mock is reported; a marked external boundary passes', () => {
    const bare = "vi.mock('@aws-sdk/client-s3')"
    assert.deepEqual(rulesOf(analyzeTestFile(INTEGRATION, bare)), [
        'integration-mock',
    ])
    const marked = [
        '// boundary-mock(Google Drive API — no sandbox tenant in PR CI)',
        "vi.mock('googleapis')",
    ].join('\n')
    assert.deepEqual(analyzeTestFile(INTEGRATION, marked), [])
    assert.deepEqual(analyzeTestFile(UNIT, bare), [])
})

test('vague test file basenames are reported and behavior-named files pass', () => {
    assert.deepEqual(
        rulesOf(analyzeTestFileName('packages/react/tests/utils.test.ts')),
        ['vague-filename'],
    )
    assert.deepEqual(
        rulesOf(analyzeTestFileName('packages/react/tests/misc.spec.tsx')),
        ['vague-filename'],
    )
    assert.deepEqual(
        analyzeTestFileName(
            'packages/server/tests/upload-token-trust-content-length-and-key-binding.test.ts',
        ),
        [],
    )
})

test('continue-on-error in a workflow is reported wherever it appears', () => {
    const text = ['jobs:', '  build:', '    continue-on-error: true'].join('\n')
    const found = analyzeWorkflow('.github/workflows/example.yml', text)
    assert.deepEqual(rulesOf(found), ['continue-on-error'])
    assert.equal(found[0].line, 3)
})

test('the regen-guard check fails when a guarded spec loses its CI throw and passes while both throws exist', () => {
    const guarded = `
        if (process.env.CI && process.env.UPDATE_PARITY) {
            throw new Error('fixture regeneration is forbidden in CI')
        }
        if (process.env.CI && process.env.UPDATE_A11Y_BASELINE) {
            throw new Error('baseline regeneration is forbidden in CI')
        }`
    assert.deepEqual(
        analyzeRegenGuards(() => guarded),
        [],
    )
    const gutted = 'export {}'
    const found = analyzeRegenGuards(() => gutted)
    assert.deepEqual(rulesOf(found), ['regen-guard', 'regen-guard'])
})

test('the exceptions list ships empty so findings are fixed rather than pinned', () => {
    assert.deepEqual(KNOWN_EXCEPTIONS, [])
})

test('the self-scan exclusion contains exactly this fixture-corpus file, so it cannot grow into a bypass list', () => {
    assert.deepEqual(
        [...SELF_TEST_FIXTURE_FILES],
        ['scripts/ci/test-quality-guard.test.mjs'],
    )
})
