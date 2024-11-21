import {
    BoxIcon,
    CameraIcon,
    DropBoxIcon,
    GoogleDriveIcon,
    LinkIcon,
    MyDeviceIcon,
    OneDriveIcon,
    UnsplashIcon,
} from 'frontend/components'

export type Method = {
    id: string
    name: string
    icon: JSX.Element
    disabled?: boolean
}

export const METHODS: Method[] = [
    { id: 'INTERNAL', name: 'My Device', icon: <MyDeviceIcon /> },
    { id: 'GOOGLE_DRIVE', name: 'Google Drive', icon: <GoogleDriveIcon /> },
    { id: 'ONE_DRIVE', name: 'OneDrive', icon: <OneDriveIcon /> },
    { id: 'BOX', name: 'Box', icon: <BoxIcon />, disabled: true },
    { id: 'LINK', name: 'Link', icon: <LinkIcon /> },
    { id: 'CAMERA', name: 'Camera', icon: <CameraIcon /> },
    { id: 'DROPBOX', name: 'Dropbox', icon: <DropBoxIcon />, disabled: true },
    {
        id: 'UNSPLASH',
        name: 'Unsplash',
        icon: <UnsplashIcon />,
        disabled: true,
    },
]
