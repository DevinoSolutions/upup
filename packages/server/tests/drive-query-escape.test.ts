// packages/server/tests/drive-query-escape.test.ts
// Audit S5 — Google Drive query-value injection via unescaped backslash
import { describe, it, expect } from 'vitest'
import { escapeDriveQueryValue } from '../src/drive-clients'

describe('escapeDriveQueryValue', () => {
    it('passes through plain text unchanged', () => {
        expect(escapeDriveQueryValue('hello world')).toBe('hello world')
    })

    it('escapes a single-quote', () => {
        // "it's" → "it\'s"
        expect(escapeDriveQueryValue("it's")).toBe("it\\'s")
    })

    it('escapes a backslash', () => {
        // "a\b" → "a\\b"
        const bslash = '\\'
        expect(escapeDriveQueryValue(`a${bslash}b`)).toBe(
            `a${bslash}${bslash}b`,
        )
    })

    it('escapes backslash-then-quote without leaving an exploitable sequence (audit S5)', () => {
        // Input:    4 chars — a, \, ', b
        // The bug:  old code only escaped ' → \', turning a\'b into a\\'
        //           which the Drive query parser reads as: a + escaped-backslash + end-of-string
        // Fix:      escape \ first → \\, then ' → \', giving a\\\' (6 chars total with a and b)
        const bslash = '\\'
        const squote = "'"
        const input = `a${bslash}${squote}b` // 4 chars: a \ ' b
        // Expected output: 6 chars — a \ \ \ ' b
        // (backslash doubled to \\, then quote preceded by \)
        const expected = `a${bslash}${bslash}${bslash}${squote}b`
        expect(escapeDriveQueryValue(input)).toBe(expected)
    })

    it('escapes multiple quotes', () => {
        expect(escapeDriveQueryValue("O'Brien's")).toBe("O\\'Brien\\'s")
    })

    it('escapes multiple backslashes', () => {
        const bslash = '\\'
        expect(escapeDriveQueryValue(`a${bslash}${bslash}b`)).toBe(
            `a${bslash}${bslash}${bslash}${bslash}b`,
        )
    })
})
