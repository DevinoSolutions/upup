'use client'

import React from 'react'
import type { Translations } from '@upup/shared'
import { FileSource } from '@upup/shared'

// TODO: Import adapter icon + component once migrated (Task 3.8)

/** Translation key used for each FileSource's display name */
export const adapterNameKeys: Record<FileSource, keyof Translations> = {
    [FileSource.LOCAL]: 'myDevice',
    [FileSource.GOOGLE_DRIVE]: 'googleDrive',
    [FileSource.ONE_DRIVE]: 'oneDrive',
    [FileSource.DROPBOX]: 'dropbox',
    [FileSource.URL]: 'link',
    [FileSource.CAMERA]: 'camera',
    [FileSource.MICROPHONE]: 'audio',
    [FileSource.SCREEN]: 'screenCapture',
}

export type AdapterEntry = {
    id: FileSource
    nameKey: keyof Translations
    /** TODO: replace with real icon component (Task 3.8) */
    Icon: React.ComponentType | undefined
    /** TODO: replace with real uploader component (Task 3.8) */
    Component: React.ComponentType | undefined
}

export const uploadAdapterObject: Record<FileSource, AdapterEntry> = {
    [FileSource.LOCAL]: {
        id: FileSource.LOCAL,
        nameKey: 'myDevice',
        Icon: undefined,
        Component: undefined,
    },
    [FileSource.GOOGLE_DRIVE]: {
        id: FileSource.GOOGLE_DRIVE,
        nameKey: 'googleDrive',
        Icon: undefined,
        Component: undefined,
    },
    [FileSource.ONE_DRIVE]: {
        id: FileSource.ONE_DRIVE,
        nameKey: 'oneDrive',
        Icon: undefined,
        Component: undefined,
    },
    [FileSource.DROPBOX]: {
        id: FileSource.DROPBOX,
        nameKey: 'dropbox',
        Icon: undefined,
        Component: undefined,
    },
    [FileSource.URL]: {
        id: FileSource.URL,
        nameKey: 'link',
        Icon: undefined,
        Component: undefined,
    },
    [FileSource.CAMERA]: {
        id: FileSource.CAMERA,
        nameKey: 'camera',
        Icon: undefined,
        Component: undefined,
    },
    [FileSource.MICROPHONE]: {
        id: FileSource.MICROPHONE,
        nameKey: 'audio',
        Icon: undefined,
        Component: undefined,
    },
    [FileSource.SCREEN]: {
        id: FileSource.SCREEN,
        nameKey: 'screenCapture',
        Icon: undefined,
        Component: undefined,
    },
}
