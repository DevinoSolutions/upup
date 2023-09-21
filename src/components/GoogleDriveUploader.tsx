import type { GoogleConfigs } from 'types/GoogleConfigs'

import { Dispatch, SetStateAction } from 'react'
import FileBrowser from './UpupUploader/FileBrowser'
import useGoogleDrive from '../hooks/useGoogleDrive'

type Props = {
    googleConfigs: GoogleConfigs
    setFiles: Dispatch<SetStateAction<File[]>>
    setView: (view: string) => void
    accept?: string
}

const GoogleDriveUploader = ({
    setFiles,
    setView,
    googleConfigs,
    accept,
}: Props) => {
    const { googleFiles, handleSignOut, user, downloadFile } =
        useGoogleDrive(googleConfigs)

    return (
        <FileBrowser
            googleFiles={googleFiles}
            handleSignOut={handleSignOut}
            user={user}
            downloadFile={downloadFile}
            setFiles={setFiles}
            setView={setView}
            accept={accept || '*'}
        />
    )
}

export default GoogleDriveUploader
