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

export type AdapterState = 'idle' | 'authenticating' | 'authenticated' | 'browsing' | 'session-expired'

export type AdapterEventMap = {
    'authenticated': { token: string }
    'signed-out': Record<string, never>
    'session-expired': Record<string, never>
    'files-loaded': { files: DriveFile[]; path: string }
    'file-downloaded': { file: File; driveFile: DriveFile }
    'download-progress': { driveFileId: string; loaded: number; total: number }
    'error': { error: Error; action: string }
    'state-change': { state: AdapterState }
}
