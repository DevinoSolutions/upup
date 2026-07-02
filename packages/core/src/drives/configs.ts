export interface GoogleDriveConfig {
    clientId: string
    apiKey: string
    appId: string
}

export interface OneDriveConfig {
    clientId: string
    redirectUri?: string
}

export interface DropboxConfig {
    clientId: string
    redirectUri?: string
}

export interface BoxConfig {
    clientId: string
    redirectUri?: string
}

/** Public cloud-drive configuration — identical shape from framework props down to plugins. */
export interface CloudDrivesConfig {
    googleDrive?: GoogleDriveConfig
    oneDrive?: OneDriveConfig
    dropbox?: DropboxConfig
    box?: BoxConfig
}
