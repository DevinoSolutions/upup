import { describe, it, expect } from 'vitest'
import { enUS } from '../../i18n/locales/en-US'
import type { UpupMessages, LocaleBundle } from '../../i18n/types'

describe('en-US locale bundle', () => {
    it('has correct metadata', () => {
        expect(enUS.code).toBe('en-US')
        expect(enUS.language).toBe('English')
        expect(enUS.dir).toBe('ltr')
    })

    it('has all required namespaces', () => {
        const namespaces: (keyof UpupMessages)[] = [
            'common',
            'adapters',
            'dropzone',
            'header',
            'fileList',
            'filePreview',
            'driveBrowser',
            'url',
            'camera',
            'audio',
            'screenCapture',
            'branding',
            'errors',
        ]
        for (const ns of namespaces) {
            expect(enUS.messages).toHaveProperty(ns)
        }
    })

    it('uses ICU plural syntax', () => {
        expect(enUS.messages.header.filesSelected).toContain(
            '{count, plural,',
        )
        expect(enUS.messages.fileList.uploadFiles).toContain(
            '{count, plural,',
        )
        expect(enUS.messages.dropzone.maxFileCount).toContain(
            '{limit, plural,',
        )
    })

    it('uses ICU {var} syntax, not {{var}}', () => {
        // Check all leaf string values for old {{var}} patterns
        function checkLeaves(obj: Record<string, unknown>, path = '') {
            for (const [key, val] of Object.entries(obj)) {
                const fullPath = path ? `${path}.${key}` : key
                if (typeof val === 'string') {
                    expect(val, `${fullPath} still uses {{var}} syntax`).not.toMatch(/\{\{/)
                } else if (typeof val === 'object' && val !== null) {
                    checkLeaves(val as Record<string, unknown>, fullPath)
                }
            }
        }
        checkLeaves(enUS.messages as unknown as Record<string, unknown>)
    })

    it('satisfies LocaleBundle type', () => {
        const bundle: LocaleBundle = enUS
        expect(bundle).toBeDefined()
    })
})
