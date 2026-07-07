import { describe, it, expect } from 'vitest'
import { formatUiMessage, pluralUiMessage, type Translations } from '@upup/core'

const baseMessages = {
    cancel: 'Cancel',
    done: 'Done',
    uploadFiles_one: 'Upload 1 file',
    uploadFiles_other: 'Upload {{count}} files',
    filesSelected_one: '1 file selected',
    filesSelected_other: '{{count}} files selected',
    addFiles_one: 'Add 1 file',
    addFiles_other: 'Add {{count}} files',
} as Translations

describe('formatUiMessage() interpolation', () => {
    it('returns template unchanged when no values', () => {
        expect(formatUiMessage('Hello world')).toBe('Hello world')
    })

    it('replaces single placeholder', () => {
        expect(formatUiMessage('Upload {{count}} files', { count: 5 })).toBe(
            'Upload 5 files',
        )
    })

    it('replaces multiple placeholders', () => {
        expect(
            formatUiMessage('{{name}} ({{size}} {{unit}})', {
                name: 'test.txt',
                size: 10,
                unit: 'MB',
            }),
        ).toBe('test.txt (10 MB)')
    })

    it('preserves unmatched placeholders', () => {
        expect(
            formatUiMessage('Hello {{name}}, {{missing}}', { name: 'World' }),
        ).toBe('Hello World, {{missing}}')
    })

    it('handles numeric values', () => {
        expect(
            formatUiMessage('Max {{size}} {{unit}}', { size: 999, unit: 'MB' }),
        ).toBe('Max 999 MB')
    })

    it('handles empty values object', () => {
        expect(formatUiMessage('No placeholders', {})).toBe('No placeholders')
    })
})

describe('pluralUiMessage()', () => {
    it('returns _one variant for count=1', () => {
        const result = pluralUiMessage(baseMessages, 'uploadFiles', 1)
        expect(result).toBe(baseMessages.uploadFiles_one)
    })

    it('returns _other variant for count>1', () => {
        const result = pluralUiMessage(baseMessages, 'uploadFiles', 5)
        expect(result).toBe(baseMessages.uploadFiles_other)
    })

    it('returns _other variant for count=0', () => {
        const result = pluralUiMessage(baseMessages, 'uploadFiles', 0)
        expect(result).toBe(baseMessages.uploadFiles_other)
    })

    it('works with filesSelected key', () => {
        expect(pluralUiMessage(baseMessages, 'filesSelected', 1)).toBe(
            baseMessages.filesSelected_one,
        )
        expect(pluralUiMessage(baseMessages, 'filesSelected', 3)).toBe(
            baseMessages.filesSelected_other,
        )
    })

    it('works with addFiles key', () => {
        expect(pluralUiMessage(baseMessages, 'addFiles', 1)).toBe(
            baseMessages.addFiles_one,
        )
        expect(pluralUiMessage(baseMessages, 'addFiles', 10)).toBe(
            baseMessages.addFiles_other,
        )
    })
})
