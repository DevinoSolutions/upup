export type DriveFile = {
    id: string
    name: string
    path: string
    size: number
    mimeType: string
    isFolder: boolean
    thumbnail?: string
    modifiedAt?: string
}

export type DriveFolder = DriveFile & {
    children: DriveFile[]
}

export type DriveUser = {
    name: string
    email?: string
    picture?: string
}

export type DriveState = 'idle' | 'authenticating' | 'authenticated' | 'browsing' | 'session-expired'

/** The one drive browse-failure surface (F-124). `action` names the operation that failed. */
export type DriveBrowserError = {
    message: string
    action?: string
}

/**
 * A page returned by DrivePlugin.loadMoreFiles (F-125). `cursor` is an OPAQUE
 * string — each plugin encodes its own native continuation token (Dropbox's
 * raw cursor, Box's "folderId:offset", Google's JSON pageToken, OneDrive's
 * absolute @odata.nextLink) inside it. The controller stores and hands it
 * back verbatim; it never branches on provider.
 */
export type DriveListPage = {
    files: DriveFile[]
    hasMore: boolean
    cursor?: string
}

export type DriveEventMap = {
    'authenticated': { token: string }
    'signed-out': Record<string, never>
    'session-expired': Record<string, never>
    'files-loaded': { files: DriveFile[]; path: string; hasMore?: boolean; cursor?: string }
    'error': { error: Error; action: string }
    'state-change': { state: DriveState }
}
