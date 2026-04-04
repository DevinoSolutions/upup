import type { FC } from 'react'

export type UploaderIcons = {
  ContainerAddMoreIcon?: FC<{ className?: string }>
  FileDeleteIcon?: FC<{ className?: string }>
  CameraDeleteIcon?: FC<{ className?: string }>
  CameraCaptureIcon?: FC<{ className?: string }>
  CameraRotateIcon?: FC<{ className?: string }>
  CameraMirrorIcon?: FC<{ className?: string }>
  CameraVideoRecordIcon?: FC<{ className?: string }>
  CameraVideoStopIcon?: FC<{ className?: string }>
  CameraVideoDeleteIcon?: FC<{ className?: string }>
  AudioRecordIcon?: FC<{ className?: string }>
  AudioStopIcon?: FC<{ className?: string }>
  AudioDeleteIcon?: FC<{ className?: string }>
  ScreenCaptureStartIcon?: FC<{ className?: string }>
  ScreenCaptureStopIcon?: FC<{ className?: string }>
  ScreenCaptureDeleteIcon?: FC<{ className?: string }>
  LoaderIcon?: FC<{ className?: string }>
}
