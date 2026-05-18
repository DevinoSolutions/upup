import type { Translations } from '@upup/core'
import { FileSource } from '@upup/core'
import { defineAsyncComponent, type Component } from 'vue'
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

export { sourceNameKeys } from './source-metadata'

const AudioUploader = defineAsyncComponent(() => import('../components/AudioUploader.vue'))
const BoxUploader = defineAsyncComponent(() => import('../components/BoxUploader.vue'))
const CameraUploader = defineAsyncComponent(() => import('../components/CameraUploader.vue'))
const DropboxUploader = defineAsyncComponent(() => import('../components/DropboxUploader.vue'))
const GoogleDriveUploader = defineAsyncComponent(() => import('../components/GoogleDriveUploader.vue'))
const OneDriveUploader = defineAsyncComponent(() => import('../components/OneDriveUploader.vue'))
const ScreenCaptureUploader = defineAsyncComponent(() => import('../components/ScreenCaptureUploader.vue'))
const UrlUploader = defineAsyncComponent(() => import('../components/UrlUploader.vue'))

export const uploadSourceObject: Record<string, {
    id: FileSource
    nameKey: keyof Translations
    Icon: Component
    Component: Component | undefined
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
