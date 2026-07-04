import type { Type } from '@angular/core'
import type { UploaderBaseProps } from '@upup/core'

export type UploaderIcons = {
    ContainerAddMoreIcon?: Type<unknown>
    FileDeleteIcon?: Type<unknown>
    CameraDeleteIcon?: Type<unknown>
    CameraCaptureIcon?: Type<unknown>
    CameraRotateIcon?: Type<unknown>
    LoaderIcon?: Type<unknown>
}

export type UploaderProps = UploaderBaseProps & {
    icons?: UploaderIcons
    style?: Record<string, string>
}
