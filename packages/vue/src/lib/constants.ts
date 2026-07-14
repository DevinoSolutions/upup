import type { Translations } from '@upupjs/core'
import { FileSource } from '@upupjs/core'
import { defineAsyncComponent, type Component } from 'vue'
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

export { sourceNameKeys } from '@upupjs/core/internal'

// ESLint lints with the plain-tsc program (not vue-tsc), so `.vue` dynamic
// imports resolve to `any` under lint; the explicit `as Component` narrows the
// async component back to its real type (vue-tsc validates the upcast).
const AudioUploader = defineAsyncComponent(
    () => import('../components/AudioUploader.vue'),
) as Component
const BoxUploader = defineAsyncComponent(
    () => import('../components/BoxUploader.vue'),
) as Component
const CameraUploader = defineAsyncComponent(
    () => import('../components/CameraUploader.vue'),
) as Component
const DropboxUploader = defineAsyncComponent(
    () => import('../components/DropboxUploader.vue'),
) as Component
const GoogleDriveUploader = defineAsyncComponent(
    () => import('../components/GoogleDriveUploader.vue'),
) as Component
const OneDriveUploader = defineAsyncComponent(
    () => import('../components/OneDriveUploader.vue'),
) as Component
const ScreenCaptureUploader = defineAsyncComponent(
    () => import('../components/ScreenCaptureUploader.vue'),
) as Component
const UrlUploader = defineAsyncComponent(
    () => import('../components/UrlUploader.vue'),
) as Component

export const uploadSourceObject: Record<
    string,
    {
        id: FileSource
        nameKey: keyof Translations
        Icon: Component
        Component: Component | undefined
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
