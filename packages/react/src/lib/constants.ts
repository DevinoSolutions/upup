import type { Translations } from '../shared/i18n/types'
import { UploadAdapter } from '../shared/types'
import CameraUploader from '../components/CameraUploader'
import DropboxUploader from '../components/DropboxUploader'
import GoogleDriveUploader from '../components/GoogleDriveUploader'
import {
    AudioIcon,
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

/** Translation key used for each adapter's display name */
export const adapterNameKeys: Record<UploadAdapter, keyof Translations> = {
    [UploadAdapter.INTERNAL]: 'myDevice',
    [UploadAdapter.GOOGLE_DRIVE]: 'googleDrive',
    [UploadAdapter.ONE_DRIVE]: 'oneDrive',
    [UploadAdapter.DROPBOX]: 'dropbox',
    [UploadAdapter.LINK]: 'link',
    [UploadAdapter.CAMERA]: 'camera',
    [UploadAdapter.AUDIO]: 'audio',
    [UploadAdapter.SCREEN]: 'screenCapture',
}

export const uploadAdapterObject = {
    [UploadAdapter.INTERNAL]: {
        id: UploadAdapter.INTERNAL,
        nameKey: 'myDevice' as keyof Translations,
        Icon: MyDeviceIcon,
        Component: undefined,
    },
    [UploadAdapter.GOOGLE_DRIVE]: {
        id: UploadAdapter.GOOGLE_DRIVE,
        nameKey: 'googleDrive' as keyof Translations,
        Icon: GoogleDriveIcon,
        Component: GoogleDriveUploader,
    },
    [UploadAdapter.ONE_DRIVE]: {
        id: UploadAdapter.ONE_DRIVE,
        nameKey: 'oneDrive' as keyof Translations,
        Icon: OneDriveIcon,
        Component: OneDriveUploader,
    },
    [UploadAdapter.DROPBOX]: {
        id: UploadAdapter.DROPBOX,
        nameKey: 'dropbox' as keyof Translations,
        Icon: DropBoxIcon,
        Component: DropboxUploader,
    },
    [UploadAdapter.LINK]: {
        id: UploadAdapter.LINK,
        nameKey: 'link' as keyof Translations,
        Icon: LinkIcon,
        Component: UrlUploader,
    },
    [UploadAdapter.CAMERA]: {
        id: UploadAdapter.CAMERA,
        nameKey: 'camera' as keyof Translations,
        Icon: CameraIcon,
        Component: CameraUploader,
    },
    [UploadAdapter.AUDIO]: {
        id: UploadAdapter.AUDIO,
        nameKey: 'audio' as keyof Translations,
        Icon: AudioIcon,
        Component: undefined, // TODO: AudioUploader component
    },
    [UploadAdapter.SCREEN]: {
        id: UploadAdapter.SCREEN,
        nameKey: 'screenCapture' as keyof Translations,
        Icon: ScreenCastIcon,
        Component: undefined, // TODO: ScreenCaptureUploader component
    },
}
