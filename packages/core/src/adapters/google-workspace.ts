export type GoogleWorkspaceExportInfo = {
    exportMime: string
    ext: string
    docType: string
}

export const GOOGLE_WORKSPACE_EXPORT_MAP: Record<string, GoogleWorkspaceExportInfo> = {
    'application/vnd.google-apps.document': {
        exportMime:
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ext: 'docx',
        docType: 'document',
    },
    'application/vnd.google-apps.spreadsheet': {
        exportMime:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ext: 'xlsx',
        docType: 'spreadsheets',
    },
    'application/vnd.google-apps.presentation': {
        exportMime:
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        ext: 'pptx',
        docType: 'presentation',
    },
    'application/vnd.google-apps.drawing': {
        exportMime: 'image/png',
        ext: 'png',
        docType: 'drawings',
    },
}

const FORMAT_MAP: Record<string, string> = {
    docx: 'docx',
    xlsx: 'xlsx',
    pptx: 'pptx',
    png: 'png',
}

export function getGoogleWorkspaceExportInfo(
    mimeType: string | undefined,
): GoogleWorkspaceExportInfo | undefined {
    return mimeType ? GOOGLE_WORKSPACE_EXPORT_MAP[mimeType] : undefined
}

export function isGoogleWorkspaceFile(mimeType: string | undefined): boolean {
    return getGoogleWorkspaceExportInfo(mimeType) !== undefined
}

export function getGoogleWorkspaceExportUrl(
    fileId: string,
    mimeType: string | undefined,
): string | null {
    const mapping = getGoogleWorkspaceExportInfo(mimeType)
    if (!mapping) return null

    const format = FORMAT_MAP[mapping.ext] ?? mapping.ext
    return `https://docs.google.com/${mapping.docType}/d/${fileId}/export?format=${format}`
}
