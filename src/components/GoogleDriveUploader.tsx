import type { GoogleConfigs } from 'types/GoogleConfigs'

import React, { Dispatch, SetStateAction } from 'react'
import FileBrowser from './UpupUploader/FileBrowser'
import useGoogleDrive from '../hooks/useGoogleDrive'

type Props = {
    googleConfigs: GoogleConfigs
    setFiles: Dispatch<SetStateAction<File[]>>
    setView: (view: string) => void
}

const GoogleDriveUploader = ({ setFiles, setView, googleConfigs }: Props) => {
    const { googleFiles, handleSignout, user, downloadFile } =
        useGoogleDrive(googleConfigs)

    return (
        <FileBrowser
            googleFiles={googleFiles}
            handleSignout={handleSignout}
            user={user}
            downloadFile={downloadFile}
            setFiles={setFiles}
            setView={setView}
        />
    )
}

export default GoogleDriveUploader
