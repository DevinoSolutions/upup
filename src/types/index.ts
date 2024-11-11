export type { BaseConfigs } from './BaseConfigs'
export type { CloudStorageConfigs } from './CloudStorageConfigs'
export type { OneDriveResponse, OneDriveValue } from './OneDriveConfigs'
export type { S3Configs } from './S3Configs'

export enum Adapter {
    INTERNAL = 'INTERNAL',
    GOOGLE_DRIVE = 'GOOGLE_DRIVE',
    ONE_DRIVE = 'ONE_DRIVE',
    BOX = 'BOX',
    LINK = 'LINK',
    CAMERA = 'CAMERA',
    DROPBOX = 'DROPBOX',
    UNSPLASH = 'UNSPLASH',
}

export type MicrosoftUser = {
    name: string
    mail: string
}

export type OneDriveFile = {
    id: string
    name: string
    isFolder: boolean
    children?: OneDriveFile[]
    thumbnails?: {
        small: { url: string }
        medium: { url: string }
        large: { url: string }
    } | null
    '@microsoft.graph.downloadUrl'?: string
    file?: {
        mimeType: string
    }
}

export type OneDriveRoot = {
    id: string
    name: string
    isFolder: boolean
    children: OneDriveFile[]
}

export type GoogleFile = {
    id: string
    name: string
    mimeType: string
    fileExtension?: string
    size?: number
    thumbnailLink?: string
    parents?: string[]
    children?: GoogleFile[]
}

export type GoogleDriveRoot = {
    id: string
    name: string
    children: GoogleFile[]
}
