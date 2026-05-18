import type { Translations } from '@upup/core'
import { FileSource } from '@upup/core'

/** Maps each FileSource to its i18n translation key. No Vue dependency. */
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
