import { describe, it, expect } from 'vitest'
import type { DriveFile } from '@upup/core'
import {
    GOOGLE_WORKSPACE_EXPORTS,
    getWorkspaceExportInfo,
    getDriveEffectiveExtension,
    isDriveFileAccepted,
} from '../src/lib/googleDriveUtils'

// Minimal GoogleFile shape used by the utils
type MockFile = { name: string; mimeType: string }

// ─────────────────────────────────────────────
// GOOGLE_WORKSPACE_EXPORTS constant
// ─────────────────────────────────────────────
describe('GOOGLE_WORKSPACE_EXPORTS', () => {
    it('contains entries for Docs, Sheets, and Slides', () => {
        expect(GOOGLE_WORKSPACE_EXPORTS).toHaveProperty(
            'application/vnd.google-apps.document',
        )
        expect(GOOGLE_WORKSPACE_EXPORTS).toHaveProperty(
            'application/vnd.google-apps.spreadsheet',
        )
        expect(GOOGLE_WORKSPACE_EXPORTS).toHaveProperty(
            'application/vnd.google-apps.presentation',
        )
    })

    it('Docs maps to docx', () => {
        expect(
            GOOGLE_WORKSPACE_EXPORTS['application/vnd.google-apps.document']!
                .extension,
        ).toBe('docx')
    })

    it('Sheets maps to xlsx', () => {
        expect(
            GOOGLE_WORKSPACE_EXPORTS['application/vnd.google-apps.spreadsheet']!
                .extension,
        ).toBe('xlsx')
    })

    it('Slides maps to pptx', () => {
        expect(
            GOOGLE_WORKSPACE_EXPORTS[
                'application/vnd.google-apps.presentation'
            ]!.extension,
        ).toBe('pptx')
    })

    it('each entry has an exportUrl function', () => {
        for (const entry of Object.values(GOOGLE_WORKSPACE_EXPORTS)) {
            expect(typeof entry.exportUrl).toBe('function')
        }
    })

    it('Docs exportUrl contains the file id', () => {
        const url =
            GOOGLE_WORKSPACE_EXPORTS[
                'application/vnd.google-apps.document'
            ]!.exportUrl('abc123')
        expect(url).toContain('abc123')
        expect(url).toContain('docs.google.com')
    })
})

// ─────────────────────────────────────────────
// getWorkspaceExportInfo
// ─────────────────────────────────────────────
describe('getWorkspaceExportInfo', () => {
    it('returns export info for a Google Docs MIME type', () => {
        const info = getWorkspaceExportInfo(
            'application/vnd.google-apps.document',
        )
        expect(info).toBeDefined()
        expect(info!.extension).toBe('docx')
    })

    it('returns export info for a Google Sheets MIME type', () => {
        const info = getWorkspaceExportInfo(
            'application/vnd.google-apps.spreadsheet',
        )
        expect(info!.extension).toBe('xlsx')
    })

    it('returns undefined for a regular PDF MIME type', () => {
        expect(getWorkspaceExportInfo('application/pdf')).toBeUndefined()
    })

    it('returns undefined for an image MIME type', () => {
        expect(getWorkspaceExportInfo('image/png')).toBeUndefined()
    })

    it('returns undefined for an empty string', () => {
        expect(getWorkspaceExportInfo('')).toBeUndefined()
    })
})

// ─────────────────────────────────────────────
// getDriveEffectiveExtension
// ─────────────────────────────────────────────
describe('getDriveEffectiveExtension', () => {
    it('returns docx for Google Docs files', () => {
        const file: MockFile = {
            name: 'My Doc',
            mimeType: 'application/vnd.google-apps.document',
        }
        expect(getDriveEffectiveExtension(file as unknown as DriveFile)).toBe(
            'docx',
        )
    })

    it('returns xlsx for Google Sheets files', () => {
        const file: MockFile = {
            name: 'Budget',
            mimeType: 'application/vnd.google-apps.spreadsheet',
        }
        expect(getDriveEffectiveExtension(file as unknown as DriveFile)).toBe(
            'xlsx',
        )
    })

    it('returns pptx for Google Slides files', () => {
        const file: MockFile = {
            name: 'Pitch',
            mimeType: 'application/vnd.google-apps.presentation',
        }
        expect(getDriveEffectiveExtension(file as unknown as DriveFile)).toBe(
            'pptx',
        )
    })

    it('returns filename extension for a regular PDF', () => {
        const file: MockFile = {
            name: 'report.pdf',
            mimeType: 'application/pdf',
        }
        expect(getDriveEffectiveExtension(file as unknown as DriveFile)).toBe(
            'pdf',
        )
    })

    it('returns lowercase extension for mixed-case filenames', () => {
        const file: MockFile = { name: 'Photo.JPG', mimeType: 'image/jpeg' }
        expect(getDriveEffectiveExtension(file as unknown as DriveFile)).toBe(
            'jpg',
        )
    })

    it('returns the full name when filename has no dot', () => {
        // split('.').pop() returns the whole string when no '.' is present
        const file: MockFile = {
            name: 'noextension',
            mimeType: 'application/octet-stream',
        }
        expect(getDriveEffectiveExtension(file as unknown as DriveFile)).toBe(
            'noextension',
        )
    })
})

// ─────────────────────────────────────────────
// isDriveFileAccepted
// ─────────────────────────────────────────────
describe('isDriveFileAccepted', () => {
    const pdf: MockFile = { name: 'report.pdf', mimeType: 'application/pdf' }
    const png: MockFile = { name: 'photo.png', mimeType: 'image/png' }
    const doc: MockFile = {
        name: 'My Doc',
        mimeType: 'application/vnd.google-apps.document',
    }

    it('accepts all files when accept is empty', () => {
        expect(isDriveFileAccepted(pdf as unknown as DriveFile, '')).toBe(true)
    })

    it('accepts all files when accept is *', () => {
        expect(isDriveFileAccepted(pdf as unknown as DriveFile, '*')).toBe(true)
    })

    it('accepts file matching exact MIME type', () => {
        expect(
            isDriveFileAccepted(pdf as unknown as DriveFile, 'application/pdf'),
        ).toBe(true)
    })

    it('rejects file not matching MIME type', () => {
        expect(
            isDriveFileAccepted(pdf as unknown as DriveFile, 'image/png'),
        ).toBe(false)
    })

    it('accepts file matching wildcard MIME (image/*)', () => {
        expect(
            isDriveFileAccepted(png as unknown as DriveFile, 'image/*'),
        ).toBe(true)
    })

    it('rejects file not matching wildcard MIME', () => {
        expect(
            isDriveFileAccepted(pdf as unknown as DriveFile, 'image/*'),
        ).toBe(false)
    })

    it('accepts file matching dotted extension (.pdf)', () => {
        expect(isDriveFileAccepted(pdf as unknown as DriveFile, '.pdf')).toBe(
            true,
        )
    })

    it('accepts file matching bare extension (pdf)', () => {
        expect(isDriveFileAccepted(pdf as unknown as DriveFile, 'pdf')).toBe(
            true,
        )
    })

    it('rejects file not matching extension', () => {
        expect(isDriveFileAccepted(pdf as unknown as DriveFile, '.png')).toBe(
            false,
        )
    })

    it('accepts file with multiple accept tokens (comma-separated)', () => {
        expect(
            isDriveFileAccepted(
                pdf as unknown as DriveFile,
                'image/png, application/pdf',
            ),
        ).toBe(true)
    })

    it('accepts Google Docs file by exported extension (docx)', () => {
        expect(isDriveFileAccepted(doc as unknown as DriveFile, '.docx')).toBe(
            true,
        )
    })

    it('accepts Google Docs file by exported MIME type', () => {
        const exportMime =
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        expect(
            isDriveFileAccepted(doc as unknown as DriveFile, exportMime),
        ).toBe(true)
    })

    it('rejects Google Docs file when only image/* is accepted', () => {
        expect(
            isDriveFileAccepted(doc as unknown as DriveFile, 'image/*'),
        ).toBe(false)
    })
})
