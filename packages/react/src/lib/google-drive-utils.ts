'use client'

// Drive file types (inline to avoid google/microsoft ambient module deps)
export type GoogleFile = {
    id: string
    name: string
    mimeType: string
    parents?: string[]
    thumbnailLink?: string
    children?: GoogleFile[]
    fileExtension?: string
    size?: string
}

export type GoogleRoot = {
    id: string
    name: string
    children?: GoogleFile[]
}

export type GoogleUser = {
    name: string
    picture?: string
    email?: string
}

export type GoogleToken = {
    access_token: string
    expires_in: number
    error?: string
}

export type OneDriveFile = {
    id: string
    name: string
    isFolder?: boolean
    children?: OneDriveFile[]
    thumbnails?: { small?: { url: string }; large?: { url: string } } | null
    '@microsoft.graph.downloadUrl'?: string
    file?: { mimeType?: string }
}

export type OneDriveRoot = {
    id: string
    name: string
    isFolder?: boolean
    children?: OneDriveFile[]
}

export type MicrosoftUser = {
    name: string
    picture?: string
    mail?: string
}

export type DropboxFile = {
    id: string
    name: string
    path_display?: string
    isFolder?: boolean
    size?: number
    thumbnailLink?: string | null
    children?: DropboxFile[]
}

export type DropboxRoot = {
    id: string
    name: string
    isFolder?: boolean
    children?: DropboxFile[]
}

export type DropboxUser = {
    name: string
    email?: string
    picture?: string
}

/**
 * Google Workspace export mappings
 */
export const GOOGLE_WORKSPACE_EXPORTS: Record<
    string,
    {
        exportMimeType: string
        extension: string
        exportUrl: (fileId: string) => string
    }
> = {
    'application/vnd.google-apps.document': {
        exportMimeType:
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        extension: 'docx',
        exportUrl: (id: string) =>
            `https://docs.google.com/document/d/${id}/export?format=docx`,
    },
    'application/vnd.google-apps.spreadsheet': {
        exportMimeType:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        extension: 'xlsx',
        exportUrl: (id: string) =>
            `https://docs.google.com/spreadsheets/d/${id}/export?format=xlsx`,
    },
    'application/vnd.google-apps.presentation': {
        exportMimeType:
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        extension: 'pptx',
        exportUrl: (id: string) =>
            `https://docs.google.com/presentation/d/${id}/export/pptx`,
    },
}

export function getWorkspaceExportInfo(mimeType: string) {
    return GOOGLE_WORKSPACE_EXPORTS[mimeType]
}

export function getDriveEffectiveExtension(file: GoogleFile): string {
    const exportInfo = getWorkspaceExportInfo(file.mimeType)
    if (exportInfo) return exportInfo.extension
    return (file.name.split('.').pop() || '').toLowerCase()
}

export function isDriveFileAccepted(file: GoogleFile, accept: string): boolean {
    if (!accept || accept === '*') return true

    const effectiveExt = getDriveEffectiveExtension(file)
    const exportInfo = getWorkspaceExportInfo(file.mimeType)
    const effectiveMime = exportInfo
        ? exportInfo.exportMimeType
        : file.mimeType || ''

    const tokens = accept.split(',').map((t) => t.trim().toLowerCase())

    return tokens.some((token) => {
        if (!token) return false
        if (token.includes('/')) {
            if (token.endsWith('/*')) {
                const mainType = token.slice(0, token.indexOf('/'))
                return effectiveMime.toLowerCase().startsWith(mainType + '/')
            }
            return effectiveMime.toLowerCase() === token
        }
        if (token.startsWith('.')) {
            return effectiveExt === token.slice(1)
        }
        return effectiveExt === token
    })
}

/**
 * Search drive files by name (recursive)
 */
export function searchDriveFiles<T extends { name: string; children?: T[] }>(
    files: T[] | undefined,
    term: string,
): T[] {
    if (!files) return []
    if (!term) return files
    const lower = term.toLowerCase()
    return files.filter((f) => f.name.toLowerCase().includes(lower))
}
