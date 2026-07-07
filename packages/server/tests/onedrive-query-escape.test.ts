import { describe, it, expect } from 'vitest'
import { escapeODataSearchValue } from '../src/drive-clients'

describe('escapeODataSearchValue (OData literal escaping)', () => {
    it('doubles a single quote', () => {
        expect(escapeODataSearchValue("a'b")).toBe("a''b")
    })

    it('doubles each quote in an already-doubled input', () => {
        expect(escapeODataSearchValue("a''b")).toBe("a''''b")
    })

    it('leaves quote-free input unchanged', () => {
        expect(escapeODataSearchValue('report 2026')).toBe('report 2026')
    })
})
