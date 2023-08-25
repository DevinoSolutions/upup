export type OneDriveConfigs = {
    onedrive_client_id: string
    redirectUri?: string
}

export type OneDriveResponse = {
    accessToken: string
    apiEndpoint: string
    webUrl: string
    value: OneDriveValue[]
}

export type OneDriveValue = {
    id: string
    name: string
    size: number
    file: OneDriveFile
    '@microsoft.graph.downloadUrl': string
    '@data.context': string
}

export type OneDriveFile = {
    mimeType: string
    hashes: Hashes
}

export type Hashes = {
    quickXorHash: string
    sha1Hash: string
    sha256Hash: string
}
