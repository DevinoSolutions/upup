import React, { Dispatch, FC, ReactElement, SetStateAction } from 'react'
import useOneDrive from '../hooks/useOneDrive'
import { BaseConfigs, OneDriveConfigs } from '../types'
import FileBrowser from './UpupUploader/FileBrowser/BrowserOD'

interface Props {
    baseConfigs: BaseConfigs
    oneDriveConfigs: OneDriveConfigs
    setFiles: Dispatch<SetStateAction<File[]>>
    setView: Dispatch<SetStateAction<string>>
    loader?: ReactElement | null
}

/**
 * Upload files from One Drive to S3 bucket
 * @param oneDriveConfigs one drive configs
 * @param setFilesFromParent return the files to the parent component
 * @constructor
 */
const OneDriveUploader: FC<Props> = ({
    oneDriveConfigs,
    setFiles,
    setView,
    loader,
}: Props) => {
    const { user, oneDriveFiles, downloadFile, signOut, graphClient } =
        useOneDrive(oneDriveConfigs.onedrive_client_id)

    if (!oneDriveFiles) return loader || <div>Loading...</div>

    return (
        <FileBrowser
            driveFiles={oneDriveFiles}
            handleSignOut={signOut}
            user={user}
            setFiles={setFiles}
            setView={setView}
            downloadFile={downloadFile}
            graphClient={graphClient}
        />
    )
}

export default OneDriveUploader
