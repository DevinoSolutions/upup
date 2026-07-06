import type { Type } from '@angular/core'
import type { UploaderBaseProps } from '@upup/core'

export type UploaderIcons = {
    ContainerAddMoreIcon?: Type<unknown> | undefined
    FileDeleteIcon?: Type<unknown> | undefined
    CameraDeleteIcon?: Type<unknown> | undefined
    CameraCaptureIcon?: Type<unknown> | undefined
    CameraRotateIcon?: Type<unknown> | undefined
    LoaderIcon?: Type<unknown> | undefined
}

export type UploaderProps = UploaderBaseProps & {
    icons?: UploaderIcons | undefined
    style?: Record<string, string> | undefined
}
