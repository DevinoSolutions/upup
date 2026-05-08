import type { Translations } from '../shared/i18n/types'
import { FileSource } from '@upup/core'
import BoxUploader from '../components/BoxUploader'
import CameraUploader from '../components/CameraUploader'
import DropboxUploader from '../components/DropboxUploader'
import GoogleDriveUploader from '../components/GoogleDriveUploader'
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
import OneDriveUploader from '../components/OneDriveUploader'
import UrlUploader from '../components/UrlUploader'
import AudioUploader from '../components/AudioUploader'
import ScreenCaptureUploader from '../components/ScreenCaptureUploader'

/** Translation key used for each adapter's display name */
export const sourceNameKeys: Record<FileSource, keyof Translations> = {
    [FileSource.LOCAL]: 'myDevice',
    [FileSource.GOOGLE_DRIVE]: 'googleDrive',
    [FileSource.ONE_DRIVE]: 'oneDrive',
    [FileSource.DROPBOX]: 'dropbox',
    [FileSource.BOX]: 'box',
    [FileSource.URL]: 'link',
    [FileSource.CAMERA]: 'camera',
    [FileSource.MICROPHONE]: 'audio',
    [FileSource.SCREEN]: 'screenCapture',
}

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
