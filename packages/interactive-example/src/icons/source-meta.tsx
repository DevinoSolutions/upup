import React from 'react'
import {
    MyDeviceIcon,
    GoogleDriveIcon,
    OneDriveIcon,
    DropBoxIcon,
    BoxIcon,
    LinkIcon,
    CameraIcon,
    AudioIcon,
    ScreenCastIcon,
} from 'upup-react-file-uploader'

export type SourceMeta = {
    label: string
    /**
     * Optional. When omitted, EnumSelect falls back to plain segmented or
     * select rendering and just uses the humanised `label` instead of
     * promoting the option to a brand tile.
     */
    Icon?: React.FC
}

/**
 * Reuses the exact same brand icons the UpupUploader shows in its own
 * adapter selector so the playground multi-select matches the preview
 * one-for-one. Authentic colours are baked into the SVGs.
 */
export const SOURCE_META: Record<string, SourceMeta> = {
    local: { label: 'My device', Icon: MyDeviceIcon },
    google_drive: { label: 'Google Drive', Icon: GoogleDriveIcon },
    onedrive: { label: 'OneDrive', Icon: OneDriveIcon },
    dropbox: { label: 'Dropbox', Icon: DropBoxIcon },
    box: { label: 'Box', Icon: BoxIcon },
    url: { label: 'Link / URL', Icon: LinkIcon },
    camera: { label: 'Camera', Icon: CameraIcon },
    microphone: { label: 'Microphone', Icon: AudioIcon },
    screen: { label: 'Screen capture', Icon: ScreenCastIcon },
}

export const CLOUD_DRIVE_META: Record<string, SourceMeta> = {
    googleDrive: { label: 'Google Drive', Icon: GoogleDriveIcon },
    oneDrive: { label: 'OneDrive', Icon: OneDriveIcon },
    dropbox: { label: 'Dropbox', Icon: DropBoxIcon },
    box: { label: 'Box', Icon: BoxIcon },
}
