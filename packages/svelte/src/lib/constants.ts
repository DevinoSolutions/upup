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

export { sourceNameKeys } from '@upup/core/internal'

type LazyComponent = () => Promise<{ default: Component }>

const AudioUploader: LazyComponent = () =>
    import('../components/AudioUploader.svelte')
const BoxUploader: LazyComponent = () =>
    import('../components/BoxUploader.svelte')
const CameraUploader: LazyComponent = () =>
    import('../components/CameraUploader.svelte')
const DropboxUploader: LazyComponent = () =>
    import('../components/DropboxUploader.svelte')
const GoogleDriveUploader: LazyComponent = () =>
    import('../components/GoogleDriveUploader.svelte')
const OneDriveUploader: LazyComponent = () =>
    import('../components/OneDriveUploader.svelte')
const ScreenCaptureUploader: LazyComponent = () =>
    import('../components/ScreenCaptureUploader.svelte')
const UrlUploader: LazyComponent = () =>
    import('../components/UrlUploader.svelte')

export const uploadSourceObject: Record<
    string,
    {
        id: FileSource
        nameKey: keyof Translations
        Icon: Component
        Component: (() => Promise<{ default: Component }>) | undefined
    }
> = {
    [FileSource.LOCAL]: {
        id: FileSource.LOCAL,
        nameKey: 'myDevice',
        Icon: MyDeviceIcon,
        Component: undefined,
    },
    [FileSource.GOOGLE_DRIVE]: {
        id: FileSource.GOOGLE_DRIVE,
        nameKey: 'googleDrive',
        Icon: GoogleDriveIcon,
        Component: GoogleDriveUploader,
    },
    [FileSource.ONE_DRIVE]: {
        id: FileSource.ONE_DRIVE,
        nameKey: 'oneDrive',
        Icon: OneDriveIcon,
        Component: OneDriveUploader,
    },
    [FileSource.DROPBOX]: {
        id: FileSource.DROPBOX,
        nameKey: 'dropbox',
        Icon: DropboxIcon,
        Component: DropboxUploader,
    },
    [FileSource.BOX]: {
        id: FileSource.BOX,
        nameKey: 'box',
        Icon: BoxIcon,
        Component: BoxUploader,
    },
    [FileSource.URL]: {
        id: FileSource.URL,
        nameKey: 'link',
        Icon: LinkIcon,
        Component: UrlUploader,
    },
    [FileSource.CAMERA]: {
        id: FileSource.CAMERA,
        nameKey: 'camera',
        Icon: CameraIcon,
        Component: CameraUploader,
    },
    [FileSource.MICROPHONE]: {
        id: FileSource.MICROPHONE,
        nameKey: 'audio',
        Icon: AudioIcon,
        Component: AudioUploader,
    },
    [FileSource.SCREEN]: {
        id: FileSource.SCREEN,
        nameKey: 'screenCapture',
        Icon: ScreenCaptureIcon,
        Component: ScreenCaptureUploader,
    },
}
