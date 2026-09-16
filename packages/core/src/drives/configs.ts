export interface GoogleDriveConfig {
    clientId: string
    apiKey: string
    appId: string
    /**
     * Widen the Drive `files.list` corpus past the signed-in user's own My Drive
     * (#391). Off by default, so no existing picker changes shape: a Drive
     * `files.list` with no `corpora` answers from the user's own corpus only, and
     * a business account's files usually live in a shared drive, which then never
     * appears at any depth. With this on, the plugin sends `corpora=allDrives`,
     * `includeItemsFromAllDrives=true` and `supportsAllDrives=true`, and asks for
     * shared-drive items on download too. Requires no extra OAuth scope — the
     * `drive.readonly` scope the plugin already requests covers shared drives.
     */
    sharedDrives?: boolean
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
