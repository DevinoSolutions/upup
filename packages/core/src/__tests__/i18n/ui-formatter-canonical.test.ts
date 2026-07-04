import { describe, it, expect } from 'vitest'
import { formatUiMessage, pluralUiMessage } from '../../i18n/ui-translations'
import type { UiTranslations } from '../../i18n/ui-translations'

describe('formatUiMessage — canonical {{var}} interpolator (absorbs deprecated t())', () => {
    it('returns template unchanged when no values', () =>
        expect(formatUiMessage('hello')).toBe('hello'))
    it('interpolates a placeholder', () =>
        expect(formatUiMessage('{{x}} world', { x: 'hi' })).toBe('hi world'))
    it('interpolates the same placeholder twice', () =>
        expect(formatUiMessage('{{x}} and {{x}}', { x: 'hi' })).toBe('hi and hi'))
    it('leaves an unresolved placeholder literal', () =>
        expect(formatUiMessage('{{missing}}', {})).toBe('{{missing}}'))
    it('returns empty string for empty template', () =>
        expect(formatUiMessage('')).toBe(''))
})

describe('pluralUiMessage — canonical plural picker (absorbs deprecated plural())', () => {
    const tr = { file_one: 'one file', file_other: 'many files', file: 'file fallback' } as unknown as UiTranslations
    it('picks _one for count = 1', () => expect(pluralUiMessage(tr, 'file', 1)).toBe('one file'))
    it('picks _other for count > 1', () => expect(pluralUiMessage(tr, 'file', 5)).toBe('many files'))
    it('falls back to the base key when the plural form is missing', () => {
        const minimal = { file: 'file fallback' } as unknown as UiTranslations
        expect(pluralUiMessage(minimal, 'file', 2)).toBe('file fallback')
    })
    it('returns empty string when the key is completely missing', () =>
        expect(pluralUiMessage({} as UiTranslations, 'nonexistent', 1)).toBe(''))
})
