import { describe, expect, it } from 'vitest'
import { EVAL_CASES, type EvalCase } from './canned-prompts.js'
import { UpupConfigSchema } from '../mastra/schema/upup-config.schema.js'

/**
 * canned-prompts.ts is the fixture table for the paid LLM eval (src/evals/run.ts).
 * run.ts checks each case's mustSet/mustNotTouch/mustEqual keys against the
 * live agent's returned patch with plain top-level `key in merged` /
 * `merged[key]` lookups — there is no dot-path traversal to mimic, every key
 * is a literal top-level UpupConfig field name. If a key here doesn't exist
 * on UpupConfigSchema (e.g. a field gets renamed or removed), every case
 * referencing it would silently misreport pass/fail against the live agent,
 * burning real LLM spend before anyone notices. This guard catches that for
 * free, offline, before the paid runner ever starts.
 */

const SCHEMA_KEYS = new Set(Object.keys(UpupConfigSchema.shape))

function keysReferencedBy(testCase: EvalCase): string[] {
    return [
        ...testCase.mustSet,
        ...(testCase.mustNotTouch ?? []),
        ...Object.keys(testCase.mustEqual ?? {}),
    ]
}

describe('canned-prompts EVAL_CASES reference only real UpupConfigSchema keys', () => {
    it('pins the exact number of eval cases so a silent deletion turns red', () => {
        expect(EVAL_CASES.length).toBe(20)
    })

    it('has a unique name per case (run.ts reports pass/fail by name)', () => {
        const names = EVAL_CASES.map(c => c.name)
        expect(new Set(names).size).toBe(names.length)
    })

    it('never has an empty mustSet (a case with nothing to check would vacuously pass)', () => {
        for (const testCase of EVAL_CASES) {
            expect(testCase.mustSet.length).toBeGreaterThan(0)
        }
    })

    for (const testCase of EVAL_CASES) {
        it(`${testCase.name}: every mustSet/mustNotTouch/mustEqual key exists on UpupConfigSchema`, () => {
            const referenced = keysReferencedBy(testCase)
            expect(referenced.length).toBeGreaterThan(0)
            for (const key of referenced) {
                expect(SCHEMA_KEYS.has(key)).toBe(true)
            }
        })
    }
})
