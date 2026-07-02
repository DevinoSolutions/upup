export type GoogleDriveConfigs = {
    google_api_key: string
    google_app_id: string
    google_client_id: string
}

export type OneDriveConfigs = {
    onedrive_client_id: string
    redirectUri?: string
}

export type DropboxConfigs = {
    dropbox_client_id?: string
    dropbox_redirect_uri?: string
}

export type BoxConfigs = {
    box_client_id?: string
    box_redirect_uri?: string
}
