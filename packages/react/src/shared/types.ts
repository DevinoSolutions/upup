import { FC } from 'react'
import type { UploaderBaseProps } from '@upup/core'

export type UploaderIcons = {
    ContainerAddMoreIcon?: FC<{ className?: string | undefined }> | undefined

    FileDeleteIcon?: FC<{ className?: string | undefined }> | undefined

    CameraDeleteIcon?: FC<{ className?: string | undefined }> | undefined
    CameraCaptureIcon?: FC<{ className?: string | undefined }> | undefined
    CameraRotateIcon?: FC<{ className?: string | undefined }> | undefined

    LoaderIcon?: FC<{ className?: string | undefined }> | undefined
}

export type UploaderProps = UploaderBaseProps & {
    icons?: UploaderIcons | undefined
    /** v2: Inline styles applied to the root container */
    style?: React.CSSProperties | undefined
}
