import type { Component } from 'vue'
import type { UploaderBaseProps } from '@upupjs/core'

export type UploaderIcons = {
    ContainerAddMoreIcon?: Component
    FileDeleteIcon?: Component
    CameraDeleteIcon?: Component
    CameraCaptureIcon?: Component
    CameraRotateIcon?: Component
    LoaderIcon?: Component
}

export type UploaderProps = UploaderBaseProps & {
    icons?: UploaderIcons | undefined
    style?: Record<string, string> | undefined
}
