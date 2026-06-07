import type { Translations } from '@upup/core'
import { FileSource } from '@upup/core'
import type { Component } from 'svelte'
import {
    AudioIcon,
    BoxIcon,
    CameraIcon,
    DropBoxIcon,
    GoogleDriveIcon,
    LinkIcon,
    MyDeviceIcon,
    OneDriveIcon,
    ScreenCastIcon,
} from '../components/Icons'

export { sourceNameKeys } from '@upup/core'

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error – AudioUploader.svelte added in a later task; remove this directive when it lands
const AudioUploader = () => import('../components/AudioUploader.svelte')
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error – BoxUploader.svelte added in a later task; remove this directive when it lands
const BoxUploader = () => import('../components/BoxUploader.svelte')
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error – CameraUploader.svelte added in a later task; remove this directive when it lands
const CameraUploader = () => import('../components/CameraUploader.svelte')
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error – DropboxUploader.svelte added in a later task; remove this directive when it lands
const DropboxUploader = () => import('../components/DropboxUploader.svelte')
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error – GoogleDriveUploader.svelte added in a later task; remove this directive when it lands
const GoogleDriveUploader = () => import('../components/GoogleDriveUploader.svelte')
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error – OneDriveUploader.svelte added in a later task; remove this directive when it lands
const OneDriveUploader = () => import('../components/OneDriveUploader.svelte')
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error – ScreenCaptureUploader.svelte added in a later task; remove this directive when it lands
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
        Icon: DropBoxIcon,
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
        Icon: ScreenCastIcon,
        Component: ScreenCaptureUploader,
    },
}
