import { UploadAdapter } from '../../shared/types'
import CameraUploader from '../components/CameraUploader'
import DropboxUploader from '../components/DropboxUploader'
import GoogleDriveUploader from '../components/GoogleDriveUploader'
import {
    CameraIcon,
    DropBoxIcon,
    GoogleDriveIcon,
    LinkIcon,
    MyDeviceIcon,
    OneDriveIcon,
} from '../components/Icons'
import OneDriveUploader from '../components/OneDriveUploader'
import UrlUploader from '../components/UrlUploader'

export const uploadAdapterObject = {
    [UploadAdapter.INTERNAL]: {
        id: UploadAdapter.INTERNAL,
        name: 'My Device',
        Icon: MyDeviceIcon,
        Component: undefined,
    },
    [UploadAdapter.GOOGLE_DRIVE]: {
        id: UploadAdapter.GOOGLE_DRIVE,
        name: 'Google Drive',
        Icon: GoogleDriveIcon,
        Component: GoogleDriveUploader,
    },
    [UploadAdapter.ONE_DRIVE]: {
        id: UploadAdapter.ONE_DRIVE,
        name: 'OneDrive',
        Icon: OneDriveIcon,
        Component: OneDriveUploader,
    },
    [UploadAdapter.LINK]: {
        id: UploadAdapter.LINK,
        name: 'Link',
        Icon: LinkIcon,
        Component: UrlUploader,
    },
    [UploadAdapter.CAMERA]: {
        id: UploadAdapter.CAMERA,
        name: 'Camera',
        Icon: CameraIcon,
        Component: CameraUploader,
    },
    [UploadAdapter.DROPBOX]: {
        id: UploadAdapter.DROPBOX,
        name: 'Dropbox',
        Icon: DropBoxIcon,
        Component: DropboxUploader,
    },
    // {
    //     id: UploadAdapter.UNSPLASH,
    //     name: 'Unsplash',
    //     Icon: UnsplashIcon,
    // },
    // { id: UploadAdapter.BOX, name: 'Box', Icon: BoxIcon },
}
