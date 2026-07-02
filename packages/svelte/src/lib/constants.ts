import type { Translations } from '@upup/core'
import { FileSource } from '@upup/core'
import type { Component } from 'svelte'
import {
    AudioIcon,
    BoxIcon,
    CameraIcon,
    DropboxIcon,
    GoogleDriveIcon,
    LinkIcon,
    MyDeviceIcon,
    OneDriveIcon,
    ScreenCaptureIcon,
} from '../components/Icons'

export { sourceNameKeys } from '@upup/core'

const AudioUploader = () => import('../components/AudioUploader.svelte')
const BoxUploader = () => import('../components/BoxUploader.svelte')
const CameraUploader = () => import('../components/CameraUploader.svelte')
const DropboxUploader = () => import('../components/DropboxUploader.svelte')
const GoogleDriveUploader = () => import('../components/GoogleDriveUploader.svelte')
const OneDriveUploader = () => import('../components/OneDriveUploader.svelte')
const ScreenCaptureUploader = () => import('../components/ScreenCaptureUploader.svelte')
const UrlUploader = () => import('../components/UrlUploader.svelte')

export const uploadSourceObject: Record<string, {
    id: FileSource
    nameKey: keyof Translations
    Icon: Component
    Component: (() => Promise<{ default: Component }>) | undefined
}> = {
    [FileSource.LOCAL]: {
        id: FileSource.LOCAL,
        nameKey: 'myDevice' as keyof Translations,
        Icon: MyDeviceIcon,
        Component: undefined,
    },
    [FileSource.GOOGLE_DRIVE]: {
        id: FileSource.GOOGLE_DRIVE,
        nameKey: 'googleDrive' as keyof Translations,
        Icon: GoogleDriveIcon,
        Component: GoogleDriveUploader,
    },
    [FileSource.ONE_DRIVE]: {
        id: FileSource.ONE_DRIVE,
        nameKey: 'oneDrive' as keyof Translations,
        Icon: OneDriveIcon,
        Component: OneDriveUploader,
    },
    [FileSource.DROPBOX]: {
        id: FileSource.DROPBOX,
        nameKey: 'dropbox' as keyof Translations,
        Icon: DropboxIcon,
        Component: DropboxUploader,
    },
    [FileSource.BOX]: {
        id: FileSource.BOX,
        nameKey: 'box' as keyof Translations,
        Icon: BoxIcon,
        Component: BoxUploader,
    },
    [FileSource.URL]: {
        id: FileSource.URL,
        nameKey: 'link' as keyof Translations,
        Icon: LinkIcon,
        Component: UrlUploader,
    },
    [FileSource.CAMERA]: {
        id: FileSource.CAMERA,
        nameKey: 'camera' as keyof Translations,
        Icon: CameraIcon,
        Component: CameraUploader,
    },
    [FileSource.MICROPHONE]: {
        id: FileSource.MICROPHONE,
        nameKey: 'audio' as keyof Translations,
        Icon: AudioIcon,
        Component: AudioUploader,
    },
    [FileSource.SCREEN]: {
        id: FileSource.SCREEN,
        nameKey: 'screenCapture' as keyof Translations,
        Icon: ScreenCaptureIcon,
        Component: ScreenCaptureUploader,
    },
}
