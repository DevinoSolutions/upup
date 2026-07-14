import type { ReactElement } from 'react'
import Icon from './Icon'

type SourceIconProps = { className?: string | undefined }

export const MyDeviceIcon = ({ className }: SourceIconProps): ReactElement => (
    <Icon name="my-device" className={className} />
)
export const BoxIcon = ({ className }: SourceIconProps): ReactElement => (
    <Icon name="box" className={className} />
)
export const DropboxIcon = ({ className }: SourceIconProps): ReactElement => (
    <Icon name="dropbox" className={className} />
)
export const GoogleDriveIcon = ({
    className,
}: SourceIconProps): ReactElement => (
    <Icon name="google-drive" className={className} />
)
export const OneDriveIcon = ({ className }: SourceIconProps): ReactElement => (
    <Icon name="one-drive" className={className} />
)
export const LinkIcon = ({ className }: SourceIconProps): ReactElement => (
    <Icon name="link" className={className} />
)
export const CameraIcon = ({ className }: SourceIconProps): ReactElement => (
    <Icon name="camera" className={className} />
)
export const AudioIcon = ({ className }: SourceIconProps): ReactElement => (
    <Icon name="audio" className={className} />
)
export const ScreenCaptureIcon = ({
    className,
}: SourceIconProps): ReactElement => (
    <Icon name="screen-capture" className={className} />
)
