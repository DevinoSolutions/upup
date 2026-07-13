import { FileSource } from '@upupjs/core'
import type { Translations } from '@upupjs/core'
import type { TemplateResult } from 'lit-html'
import type { UploaderContext } from './types'
import {
    MyDeviceIcon,
    GoogleDriveIcon,
    OneDriveIcon,
    DropboxIcon,
    BoxIcon,
    LinkIcon,
    CameraIcon,
    AudioIcon,
    ScreenCaptureIcon,
} from '../templates/icons'
import { urlUploader } from '../templates/url-uploader'
import { cameraUploader } from '../templates/camera-uploader'
import { audioUploader } from '../templates/audio-uploader'
import { screenCaptureUploader } from '../templates/screen-capture-uploader'
import { googleDriveUploader } from '../templates/google-drive-uploader'
import { oneDriveUploader } from '../templates/one-drive-uploader'
import { dropboxUploader } from '../templates/dropbox-uploader'
import { boxUploader } from '../templates/box-uploader'

export { sourceNameKeys } from '@upupjs/core/internal'

type SourceEntry = {
    id: FileSource
    nameKey: keyof Translations
    Icon: (props?: { size?: number; class?: string }) => TemplateResult
    View?: (ctx: UploaderContext) => TemplateResult
}

export const uploadSourceObject: Record<string, SourceEntry> = {
    [FileSource.LOCAL]: {
        id: FileSource.LOCAL,
        nameKey: 'myDevice',
        Icon: MyDeviceIcon,
    },
    [FileSource.GOOGLE_DRIVE]: {
        id: FileSource.GOOGLE_DRIVE,
        nameKey: 'googleDrive',
        Icon: GoogleDriveIcon,
        View: googleDriveUploader,
    },
    [FileSource.ONE_DRIVE]: {
        id: FileSource.ONE_DRIVE,
        nameKey: 'oneDrive',
        Icon: OneDriveIcon,
        View: oneDriveUploader,
    },
    [FileSource.DROPBOX]: {
        id: FileSource.DROPBOX,
        nameKey: 'dropbox',
        Icon: DropboxIcon,
        View: dropboxUploader,
    },
    [FileSource.BOX]: {
        id: FileSource.BOX,
        nameKey: 'box',
        Icon: BoxIcon,
        View: boxUploader,
    },
    [FileSource.URL]: {
        id: FileSource.URL,
        nameKey: 'link',
        Icon: LinkIcon,
        View: urlUploader,
    },
    [FileSource.CAMERA]: {
        id: FileSource.CAMERA,
        nameKey: 'camera',
        Icon: CameraIcon,
        View: cameraUploader,
    },
    [FileSource.MICROPHONE]: {
        id: FileSource.MICROPHONE,
        nameKey: 'audio',
        Icon: AudioIcon,
        View: audioUploader,
    },
    [FileSource.SCREEN]: {
        id: FileSource.SCREEN,
        nameKey: 'screenCapture',
        Icon: ScreenCaptureIcon,
        View: screenCaptureUploader,
    },
}
