import { describe, it, expect } from 'vitest'
import { categories, allEntries } from '../categories'
import type { CategoryId } from '../types'

const EXPECTED_IDS: CategoryId[] = [
    'upload', 'sources', 'limits', 'processing', 'editor',
    'behavior', 'appearance', 'language', 'events', 'advanced',
]

describe('category manifest', () => {
    it('contains all expected categories', () => {
        expect(categories.map((c) => c.id).sort()).toEqual([...EXPECTED_IDS].sort())
    })

    it('every toggle entry has non-empty id and label', () => {
        for (const entry of allEntries()) {
            expect(entry.id).toBeTruthy()
            expect(entry.label).toBeTruthy()
        }
    })

    it('every entry has a recognized primitive kind', () => {
        const kinds = new Set(['bool', 'number', 'enum', 'multi', 'string', 'nested', 'size-unit', 'color'])
        for (const entry of allEntries()) {
            expect(kinds.has(entry.primitive)).toBe(true)
        }
    })

    it('enum and multi entries specify options', () => {
        for (const entry of allEntries()) {
            if (entry.primitive === 'enum' || entry.primitive === 'multi') {
                expect(Array.isArray(entry.options?.options)).toBe(true)
                expect((entry.options?.options as unknown[]).length).toBeGreaterThan(0)
            }
        }
    })

    it('nested entries specify fields', () => {
        for (const entry of allEntries()) {
            if (entry.primitive === 'nested') {
                expect(Array.isArray(entry.options?.fields)).toBe(true)
            }
        }
    })
})
