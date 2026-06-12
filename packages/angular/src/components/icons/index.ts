import type { Type } from '@angular/core'

export { EmptyIconComponent } from './empty-icon.component'
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
export { DropBoxIconComponent } from './dropbox-icon.component'
export { GoogleDriveIconComponent } from './google-drive-icon.component'
export { OneDriveIconComponent } from './onedrive-icon.component'
export { LinkIconComponent } from './link-icon.component'
export { CameraIconComponent } from './camera-icon.component'
export { AudioIconComponent } from './audio-icon.component'
export { ScreenCastIconComponent } from './screencast-icon.component'

// Source → icon component mapping (mirrors svelte's Icons.ts role).
// Keys are FileSource string values used in UpupUploaderProps['sources'].
import { MyDeviceIconComponent } from './my-device-icon.component'
import { BoxIconComponent } from './box-icon.component'
import { DropBoxIconComponent } from './dropbox-icon.component'
import { GoogleDriveIconComponent } from './google-drive-icon.component'
import { OneDriveIconComponent } from './onedrive-icon.component'
import { LinkIconComponent } from './link-icon.component'
import { CameraIconComponent } from './camera-icon.component'
import { AudioIconComponent } from './audio-icon.component'
import { ScreenCastIconComponent } from './screencast-icon.component'

export const SOURCE_ICONS: Record<string, Type<unknown>> = {
    MyDevice: MyDeviceIconComponent,
    Box: BoxIconComponent,
    DropBox: DropBoxIconComponent,
    GoogleDrive: GoogleDriveIconComponent,
    OneDrive: OneDriveIconComponent,
    Link: LinkIconComponent,
    Camera: CameraIconComponent,
    Audio: AudioIconComponent,
    ScreenCast: ScreenCastIconComponent,
}
