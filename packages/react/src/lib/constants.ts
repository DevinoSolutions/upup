import type { Translations } from '@upup/core'
import { FileSource } from '@upup/core'
import { lazy } from 'react'
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
import UrlUploader from '../components/UrlUploader'

export { sourceNameKeys } from '@upup/core'

const AudioUploader = lazy(() => import('../components/AudioUploader'))
const BoxUploader = lazy(() => import('../components/BoxUploader'))
const CameraUploader = lazy(() => import('../components/CameraUploader'))
const DropboxUploader = lazy(() => import('../components/DropboxUploader'))
const GoogleDriveUploader = lazy(() => import('../components/GoogleDriveUploader'))
const OneDriveUploader = lazy(() => import('../components/OneDriveUploader'))
const ScreenCaptureUploader = lazy(() => import('../components/ScreenCaptureUploader'))

export const uploadSourceObject = {
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
