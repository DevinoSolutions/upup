import type { Translations } from '@useupup/core'
import { FileSource } from '@useupup/core'
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
import UrlUploader from '../components/UrlUploader'
import { preloadableLazy } from './preloadable-lazy'

export { sourceNameKeys } from '@useupup/core/internal'

const AudioUploader = preloadableLazy(
    () => import('../components/AudioUploader'),
)
const BoxUploader = preloadableLazy(() => import('../components/BoxUploader'))
const CameraUploader = preloadableLazy(
    () => import('../components/CameraUploader'),
)
const DropboxUploader = preloadableLazy(
    () => import('../components/DropboxUploader'),
)
const GoogleDriveUploader = preloadableLazy(
    () => import('../components/GoogleDriveUploader'),
)
const OneDriveUploader = preloadableLazy(
    () => import('../components/OneDriveUploader'),
)
const ScreenCaptureUploader = preloadableLazy(
    () => import('../components/ScreenCaptureUploader'),
)

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

/**
 * Sources whose sign-in opens a popup straight from the view's mount effect, so
 * the first click has to mount the view without suspending (a popup opened in a
 * later task is refused by strict blockers). Their chunks are warmed as soon as
 * the source selector is on screen; the other lazy sources only on pointer or
 * focus intent, to keep idle bandwidth for sources the person may never open.
 */
export const IDLE_PRELOAD_SOURCES: readonly FileSource[] = [
    FileSource.ONE_DRIVE,
    FileSource.DROPBOX,
    FileSource.BOX,
]

/** Start fetching a source's view chunk. A no-op for sources that ship in the main entry. */
export function preloadSource(id: FileSource): void {
    const Component: unknown = uploadSourceObject[id].Component
    if (
        typeof Component === 'function' &&
        'preload' in Component &&
        typeof Component.preload === 'function'
    ) {
        void (Component.preload as () => Promise<void>)()
    }
}
