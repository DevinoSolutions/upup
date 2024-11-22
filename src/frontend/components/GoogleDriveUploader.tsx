import FileBrowser from 'frontend/components/UpupUploader/FileBrowser'
import { useGoogleDrive } from 'frontend/hooks'
import type { GoogleConfigs } from 'frontend/types'
import React, { Dispatch, SetStateAction } from 'react'

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
            driveFiles={googleFiles}
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
