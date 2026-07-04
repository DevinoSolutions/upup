import { FC } from 'react'
import type { UploaderBaseProps } from '@upup/core'

export type UploaderIcons = {
    ContainerAddMoreIcon?: FC<{ className?: string }>

    FileDeleteIcon?: FC<{ className?: string }>

    CameraDeleteIcon?: FC<{ className?: string }>
    CameraCaptureIcon?: FC<{ className?: string }>
    CameraRotateIcon?: FC<{ className?: string }>

    LoaderIcon?: FC<{ className?: string }>
}

export type UploaderProps = UploaderBaseProps & {
    icons?: UploaderIcons
    /** v2: Inline styles applied to the root container */
    style?: React.CSSProperties
}
