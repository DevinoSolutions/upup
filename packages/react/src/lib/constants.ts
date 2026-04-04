'use client'

import React from 'react'
import { FileSource } from '@upup/shared'
import {
    TbDeviceDesktop,
    TbBrandGoogleDrive,
    TbBrandOnedrive,
    TbBrandDropbox,
    TbLink,
    TbCamera,
    TbMicrophone,
    TbScreenShare,
} from 'react-icons/tb'

/** Dot-path translation key used for each FileSource's display name */
export const adapterNameKeys: Record<FileSource, string> = {
    [FileSource.LOCAL]: 'adapters.myDevice',
    [FileSource.GOOGLE_DRIVE]: 'adapters.googleDrive',
    [FileSource.ONE_DRIVE]: 'adapters.oneDrive',
    [FileSource.DROPBOX]: 'adapters.dropbox',
    [FileSource.URL]: 'adapters.link',
    [FileSource.CAMERA]: 'adapters.camera',
    [FileSource.MICROPHONE]: 'adapters.audio',
    [FileSource.SCREEN]: 'adapters.screenCapture',
}

export type AdapterEntry = {
    id: FileSource
    nameKey: string
    Icon: React.ComponentType<{ size?: number }> | undefined
    /** TODO: replace with real uploader component (Task 3.8) */
    Component: React.ComponentType | undefined
}

export const uploadAdapterObject: Record<FileSource, AdapterEntry> = {
    [FileSource.LOCAL]: {
        id: FileSource.LOCAL,
        nameKey: 'adapters.myDevice',
        Icon: TbDeviceDesktop,
        Component: undefined,
    },
    [FileSource.GOOGLE_DRIVE]: {
        id: FileSource.GOOGLE_DRIVE,
        nameKey: 'adapters.googleDrive',
        Icon: TbBrandGoogleDrive,
        Component: undefined,
    },
    [FileSource.ONE_DRIVE]: {
        id: FileSource.ONE_DRIVE,
        nameKey: 'adapters.oneDrive',
        Icon: TbBrandOnedrive,
        Component: undefined,
    },
    [FileSource.DROPBOX]: {
        id: FileSource.DROPBOX,
        nameKey: 'adapters.dropbox',
        Icon: TbBrandDropbox,
        Component: undefined,
    },
    [FileSource.URL]: {
        id: FileSource.URL,
        nameKey: 'adapters.link',
        Icon: TbLink,
        Component: undefined,
    },
    [FileSource.CAMERA]: {
        id: FileSource.CAMERA,
        nameKey: 'adapters.camera',
        Icon: TbCamera,
        Component: undefined,
    },
    [FileSource.MICROPHONE]: {
        id: FileSource.MICROPHONE,
        nameKey: 'adapters.audio',
        Icon: TbMicrophone,
        Component: undefined,
    },
    [FileSource.SCREEN]: {
        id: FileSource.SCREEN,
        nameKey: 'adapters.screenCapture',
        Icon: TbScreenShare,
        Component: undefined,
    },
}
