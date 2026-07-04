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

export type DriveEventMap = {
    'authenticated': { token: string }
    'signed-out': Record<string, never>
    'session-expired': Record<string, never>
    'files-loaded': { files: DriveFile[]; path: string }
    'error': { error: Error; action: string }
    'state-change': { state: DriveState }
}
