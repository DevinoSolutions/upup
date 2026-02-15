import { GoogleFile } from 'google'

/**
 * Mapping of Google Workspace mimeTypes to their Office Open XML export formats.
 */
export const GOOGLE_WORKSPACE_EXPORTS: Record<
    string,
    { exportMimeType: string; extension: string }
> = {
    'application/vnd.google-apps.document': {
        exportMimeType:
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        extension: 'docx',
    },
    'application/vnd.google-apps.spreadsheet': {
        exportMimeType:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        extension: 'xlsx',
    },
    'application/vnd.google-apps.presentation': {
        exportMimeType:
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        extension: 'pptx',
    },
}

/**
 * Returns the export info for a Google Workspace mimeType, or undefined for
 * non-Workspace files.
 */
export function getWorkspaceExportInfo(mimeType: string) {
    return GOOGLE_WORKSPACE_EXPORTS[mimeType]
}

/**
 * Returns the effective file extension for a Google Drive file.
 * - Workspace files: the export extension (docx / xlsx / pptx).
 * - Non-Workspace files: the extension extracted from the filename.
 */
export function getDriveEffectiveExtension(file: GoogleFile): string {
    const exportInfo = getWorkspaceExportInfo(file.mimeType)
    if (exportInfo) return exportInfo.extension
    return (file.name.split('.').pop() || '').toLowerCase()
}

/**
 * Checks whether a Google Drive file is accepted by an `accept` string.
 *
 * Supports:
 * - Empty / '*' accept → all files accepted.
 * - Bare extension tokens: "pdf", "docx"
 * - Dotted extension tokens: ".pdf", ".docx"
 * - Full MIME types: "application/pdf"
 * - Wildcard MIME types: "image/*"
 *
 * For Workspace files the effective extension and exportMimeType are used.
 * For non-Workspace files the filename extension and file.mimeType are used.
 */
export function isDriveFileAccepted(file: GoogleFile, accept: string): boolean {
    if (!accept || accept === '*') return true

    const effectiveExt = getDriveEffectiveExtension(file)
    const exportInfo = getWorkspaceExportInfo(file.mimeType)
    const effectiveMime = exportInfo
        ? exportInfo.exportMimeType
        : file.mimeType || ''

    const tokens = accept.split(',').map(t => t.trim().toLowerCase())

    return tokens.some(token => {
        if (!token) return false

        // MIME type token (contains '/')
        if (token.includes('/')) {
            if (token.endsWith('/*')) {
                // wildcard: "image/*" matches "image/png"
                const mainType = token.slice(0, token.indexOf('/'))
                return effectiveMime.toLowerCase().startsWith(mainType + '/')
            }
            return effectiveMime.toLowerCase() === token
        }

        // Dotted extension token: ".pdf"
        if (token.startsWith('.')) {
            return effectiveExt === token.slice(1)
        }

        // Bare extension token: "pdf"
        return effectiveExt === token
    })
}
