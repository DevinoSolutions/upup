import { describe, it, expect } from 'vitest'
import { escapeDriveQueryValue } from '../src/drives/query-escape'

// The backslash is built rather than written literally so no assertion below
// depends on counting escape characters in this file's own source.
const BS = String.fromCharCode(92)

describe('escapeDriveQueryValue (core — shared by the browser plugin and the server drive client)', () => {
    it('leaves a value with nothing to escape untouched', () => {
        expect(escapeDriveQueryValue('Team Videos 2026')).toBe(
            'Team Videos 2026',
        )
    })

    it('escapes a single quote so it cannot close the query literal', () => {
        expect(escapeDriveQueryValue("it's")).toBe(`it${BS}'s`)
    })

    it('escapes every quote, not just the first', () => {
        expect(escapeDriveQueryValue("O'Brien's")).toBe(`O${BS}'Brien${BS}'s`)
    })

    it('escapes a backslash by doubling it', () => {
        expect(escapeDriveQueryValue(`a${BS}b`)).toBe(`a${BS}${BS}b`)
    })

    it('escapes backslashes BEFORE quotes, so an injected backslash-quote cannot neutralise the escape', () => {
        // A naive quote-first implementation turns this into a${BS}${BS}' —
        // a literal backslash followed by an UNESCAPED quote, which ends the
        // literal and hands the rest of the value to the query parser.
        expect(escapeDriveQueryValue(`a${BS}'`)).toBe(`a${BS}${BS}${BS}'`)
    })

    it('handles a value that is only escape characters', () => {
        expect(escapeDriveQueryValue(`${BS}${BS}`)).toBe(`${BS}${BS}${BS}${BS}`)
    })

    it('returns an empty string unchanged', () => {
        expect(escapeDriveQueryValue('')).toBe('')
    })
})
