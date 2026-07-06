import Icon from './Icon'

type SourceIconProps = { className?: string | undefined }

export const MyDeviceIcon = ({ className }: SourceIconProps) => (
    <Icon name="my-device" className={className} />
)
export const BoxIcon = ({ className }: SourceIconProps) => (
    <Icon name="box" className={className} />
)
export const DropboxIcon = ({ className }: SourceIconProps) => (
    <Icon name="dropbox" className={className} />
)
export const GoogleDriveIcon = ({ className }: SourceIconProps) => (
    <Icon name="google-drive" className={className} />
)
export const OneDriveIcon = ({ className }: SourceIconProps) => (
    <Icon name="one-drive" className={className} />
)
export const LinkIcon = ({ className }: SourceIconProps) => (
    <Icon name="link" className={className} />
)
export const CameraIcon = ({ className }: SourceIconProps) => (
    <Icon name="camera" className={className} />
)
export const AudioIcon = ({ className }: SourceIconProps) => (
    <Icon name="audio" className={className} />
)
export const ScreenCaptureIcon = ({ className }: SourceIconProps) => (
    <Icon name="screen-capture" className={className} />
)
