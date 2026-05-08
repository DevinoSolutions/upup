import { describe, expect, it } from 'vitest'
import { getLocalAssistantPatch } from '../ai/localAssistant'

describe('getLocalAssistantPatch', () => {
    it('handles the playground source seed without calling Mastra', () => {
        const event = getLocalAssistantPatch('Add Google Drive and Dropbox')

        expect(event?.patch.sources).toEqual([
            'local',
            'url',
            'camera',
            'microphone',
            'screen',
            'googleDrive',
            'dropbox',
        ])
    })

    it('handles the playground photo limit seed', () => {
        const event = getLocalAssistantPatch('Photos only, max 10MB')

        expect(event?.patch.allowedFileTypes).toBe('images')
        expect(event?.patch.maxFileSize).toEqual({ size: 10, unit: 'MB' })
    })

    it('handles the playground dark rounded seed', () => {
        const event = getLocalAssistantPatch('Make it dark with rounded corners')

        expect((event?.patch.theme as any)?.mode).toBe('dark')
        expect((event?.patch.theme as any)?.slots?.uploader?.container).toBe('rounded-2xl')
    })

    it('uses the v2 i18n config shape for locale prompts', () => {
        const event = getLocalAssistantPatch('Switch to French')

        expect((event?.patch.i18n as any)?.locale).toBe('fr-FR')
        expect((event?.patch as any).locale).toBeUndefined()
    })
})
