import React from 'react'
import {
    MyDeviceIcon,
    GoogleDriveIcon,
    OneDriveIcon,
    DropboxIcon,
    BoxIcon,
    LinkIcon,
    CameraIcon,
    AudioIcon,
    ScreenCaptureIcon,
} from '@useupup/react'

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
    googleDrive: { label: 'Google Drive', Icon: GoogleDriveIcon },
    oneDrive: { label: 'OneDrive', Icon: OneDriveIcon },
    dropbox: { label: 'Dropbox', Icon: DropboxIcon },
    box: { label: 'Box', Icon: BoxIcon },
    url: { label: 'Link / URL', Icon: LinkIcon },
    camera: { label: 'Camera', Icon: CameraIcon },
    microphone: { label: 'Microphone', Icon: AudioIcon },
    screen: { label: 'Screen capture', Icon: ScreenCaptureIcon },
}

export const CLOUD_DRIVE_META = {
    googleDrive: { label: 'Google Drive', Icon: GoogleDriveIcon },
    oneDrive: { label: 'OneDrive', Icon: OneDriveIcon },
    dropbox: { label: 'Dropbox', Icon: DropboxIcon },
    box: { label: 'Box', Icon: BoxIcon },
} satisfies Record<string, SourceMeta>
