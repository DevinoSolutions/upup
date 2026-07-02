import type { Type } from '@angular/core'

export { IconComponent } from '../icon.component'
export { EmptyIconComponent } from './empty-icon.component'
export { TrashIconComponent } from './trash-icon.component'
export { DefaultLoaderIconComponent } from './default-loader-icon.component'
export { UploadIconComponent } from './upload-icon.component'
export { LoaderIconComponent } from './loader-icon.component'
export { PlayerPlayFilledIconComponent } from './player-play-filled-icon.component'
export { PlayerPauseFilledIconComponent } from './player-pause-filled-icon.component'
export { XIconComponent } from './x-icon.component'
export { LayoutGridIconComponent } from './layout-grid-icon.component'
export { LayoutListIconComponent } from './layout-list-icon.component'
export { FolderIconComponent } from './folder-icon.component'
export { SearchIconComponent } from './search-icon.component'
export { UserIconComponent } from './user-icon.component'
export { FileIconSvgComponent } from './file-icon-svg.component'
export { MyDeviceIconComponent } from './my-device-icon.component'
export { BoxIconComponent } from './box-icon.component'
export { DropboxIconComponent } from './dropbox-icon.component'
export { GoogleDriveIconComponent } from './google-drive-icon.component'
export { OneDriveIconComponent } from './onedrive-icon.component'
export { LinkIconComponent } from './link-icon.component'
export { CameraIconComponent } from './camera-icon.component'
export { AudioIconComponent } from './audio-icon.component'
export { ScreenCaptureIconComponent } from './screen-capture-icon.component'

// Source → icon component mapping (mirrors svelte's Icons.ts role).
// Keys are PascalCase source names; SourceSelectorComponent resolves icons
// via its own FileSource-keyed ICON_MAP, so this export is convenience API.
import { MyDeviceIconComponent } from './my-device-icon.component'
import { BoxIconComponent } from './box-icon.component'
import { DropboxIconComponent } from './dropbox-icon.component'
import { GoogleDriveIconComponent } from './google-drive-icon.component'
import { OneDriveIconComponent } from './onedrive-icon.component'
import { LinkIconComponent } from './link-icon.component'
import { CameraIconComponent } from './camera-icon.component'
import { AudioIconComponent } from './audio-icon.component'
import { ScreenCaptureIconComponent } from './screen-capture-icon.component'

export const SOURCE_ICONS: Record<string, Type<unknown>> = {
    MyDevice: MyDeviceIconComponent,
    Box: BoxIconComponent,
    Dropbox: DropboxIconComponent,
    GoogleDrive: GoogleDriveIconComponent,
    OneDrive: OneDriveIconComponent,
    Link: LinkIconComponent,
    Camera: CameraIconComponent,
    Audio: AudioIconComponent,
    ScreenCapture: ScreenCaptureIconComponent,
}
