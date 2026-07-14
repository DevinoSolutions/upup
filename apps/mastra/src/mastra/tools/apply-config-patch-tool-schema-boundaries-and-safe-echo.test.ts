import { describe, expect, it } from 'vitest'
import { isValidationError, noopObserve } from '@mastra/core/tools'
import { applyConfigPatch } from './applyConfigPatch.js'

/**
 * apply-config-patch is the assistant's ONLY write surface into the live
 * playground config. Its guarantee: the agent can set nothing but fields
 * UpupConfigSchema actually declares, with the types/bounds that schema
 * defines, and `execute` never transforms a patch that already validated.
 * These tests drive the tool's real inputSchema + execute — no agent, no
 * model, no hand-rebuilt copy of the schema.
 */

const inputSchema = applyConfigPatch.inputSchema
if (!inputSchema) {
    throw new Error('applyConfigPatch must define an inputSchema')
}

/** Validates through the tool's own Standard Schema input validator (the exact mechanism Mastra uses before `execute` ever runs). */
function validate(value: unknown) {
    // Non-null: the module-load guard above already threw if this were undefined.
    // TS narrowing doesn't cross this function boundary, so it can't see that itself.
    const result = inputSchema!['~standard'].validate(value)
    if (result instanceof Promise) {
        throw new Error(
            'expected synchronous zod validation, got an async result',
        )
    }
    return result
}

describe('applyConfigPatch tool: inputSchema boundaries', () => {
    it('accepts a well-formed partial patch', () => {
        const input = {
            patch: { maxFiles: 5, sources: ['local', 'camera'] },
            explanation: 'Limit to 5 files and allow camera capture.',
        }
        const result = validate(input)
        if (result.issues)
            throw new Error(
                `expected success, got issues: ${JSON.stringify(result.issues)}`,
            )
        expect(result.value).toEqual(input)
    })

    it('rejects a patch key that does not exist on UpupConfigSchema', () => {
        const result = validate({
            patch: { notARealUpupConfigField: true },
            explanation: 'Trying to set something outside the schema.',
        })
        expect(result.issues).toBeTruthy()
    })

    it('rejects a wrong-typed maxFiles', () => {
        const result = validate({
            patch: { maxFiles: 'five' },
            explanation: 'maxFiles should be a number, not a string.',
        })
        expect(result.issues).toBeTruthy()
    })

    it('rejects an invalid provider enum value', () => {
        const result = validate({
            patch: { provider: 'totally-not-a-real-provider' },
            explanation:
                'Provider must be one of the known StorageProvider values.',
        })
        expect(result.issues).toBeTruthy()
    })

    it('rejects an empty explanation', () => {
        const result = validate({ patch: {}, explanation: '' })
        expect(result.issues).toBeTruthy()
    })

    it('rejects an explanation over 500 characters', () => {
        const result = validate({ patch: {}, explanation: 'x'.repeat(501) })
        expect(result.issues).toBeTruthy()
    })

    it('accepts explanation right at the 1 and 500 character bounds', () => {
        const atMin = validate({ patch: {}, explanation: 'x' })
        const atMax = validate({ patch: {}, explanation: 'x'.repeat(500) })
        expect(atMin.issues).toBeFalsy()
        expect(atMax.issues).toBeFalsy()
    })
})

describe('applyConfigPatch tool: execute is a pure echo', () => {
    it('returns the exact patch + explanation it was given, unmodified', async () => {
        const input = {
            patch: {
                maxFiles: 5,
                maxRetries: 2,
                showBranding: false,
                locale: 'fr-FR',
            },
            explanation:
                'Limit to 5 files, retry twice, hide branding, use French locale.',
        }

        const output = await applyConfigPatch.execute!(input, {
            observe: noopObserve,
        })

        expect(isValidationError(output)).toBe(false)
        expect(output).toEqual(input)
    })

    it('echoes an empty patch (a no-op change) unmodified', async () => {
        const input = { patch: {}, explanation: 'No actual change requested.' }

        const output = await applyConfigPatch.execute!(input, {
            observe: noopObserve,
        })

        expect(isValidationError(output)).toBe(false)
        expect(output).toEqual(input)
    })
})
