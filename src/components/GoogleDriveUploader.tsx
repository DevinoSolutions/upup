import type { GoogleConfigs } from 'types/GoogleConfigs'

import React from 'react'
import FileBrowser from './UpupUploader/FileBrowser'

export default function GoogleDriveUploader({
    setFiles,
    setView,
    googleConfigs,
}: {
    setFiles: React.Dispatch<React.SetStateAction<File[]>>
    setView: (view: string) => void
    googleConfigs: GoogleConfigs
}) {
    return (
        <FileBrowser
            setFiles={setFiles}
            setView={setView}
            googleConfigs={googleConfigs}
        />
    )
}
