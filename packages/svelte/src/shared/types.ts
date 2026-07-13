import type { Component } from 'svelte'
import type { UploaderBaseProps } from '@useupup/core'

export type UploaderIcons = {
    ContainerAddMoreIcon?: Component
    FileDeleteIcon?: Component
    CameraDeleteIcon?: Component
    CameraCaptureIcon?: Component
    CameraRotateIcon?: Component
    LoaderIcon?: Component
}

export type UploaderProps = UploaderBaseProps & {
    icons?: UploaderIcons
    style?: Record<string, string>
}
