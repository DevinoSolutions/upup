import { ClassValue, clsx } from 'clsx'
import {
    BoxIcon,
    CameraIcon,
    DropBoxIcon,
    GoogleDriveIcon,
    LinkIcon,
    MyDeviceIcon,
    OneDriveIcon,
    UnsplashIcon,
} from 'components/Icons'
import type { ReactEventHandler } from 'react'
import { twMerge } from 'tailwind-merge'
import { Adapter } from 'types'

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export const handleImgError: ReactEventHandler<HTMLImageElement> = e => {
    const svg = `<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M14 3v4a1 1 0 0 0 1 1h4"></path><path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z"></path></svg>`
    e.currentTarget.src = `data:image/svg+xml;base64,${btoa(svg)}`
    e.currentTarget.onerror = null
}

export const getAdapterDetails = (adapter: Adapter) => {
    const adapterDetails = {
        [Adapter.INTERNAL]: { Icon: MyDeviceIcon, title: 'My Device' },
        [Adapter.GOOGLE_DRIVE]: {
            Icon: GoogleDriveIcon,
            title: 'Google Drive',
        },
        [Adapter.ONE_DRIVE]: { Icon: OneDriveIcon, title: 'OneDrive' },
        [Adapter.BOX]: { Icon: BoxIcon, title: 'Box' },
        [Adapter.LINK]: { Icon: LinkIcon, title: 'Link' },
        [Adapter.CAMERA]: { Icon: CameraIcon, title: 'Camera' },
        [Adapter.DROPBOX]: { Icon: DropBoxIcon, title: 'Dropbox' },
        [Adapter.UNSPLASH]: { Icon: UnsplashIcon, title: 'Unsplash' },
    }

    return adapterDetails[adapter]
}
