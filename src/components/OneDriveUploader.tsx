import { Dispatch, FC, SetStateAction } from 'react'
import { BaseConfigs, OneDriveConfigs } from 'types'
import useOneDrive from '../hooks/useOneDrive'
import FileBrowser from './UpupUploader/FileBrowser'

interface Props {
    baseConfigs: BaseConfigs
    oneDriveConfigs: OneDriveConfigs
    setFiles: Dispatch<SetStateAction<File[]>>
    setView: Dispatch<SetStateAction<string>>
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
}: Props) => {
    const { user, oneDriveFiles, downloadFile, signOut } = useOneDrive(
        oneDriveConfigs.onedrive_client_id,
    )

    !!user && console.log('User: ', user)
    !!oneDriveFiles && console.log('OneDriveFiles: ', oneDriveFiles)

    return (
        <FileBrowser
            driveFiles={oneDriveFiles}
            handleSignOut={signOut}
            user={user}
            setFiles={setFiles}
            setView={setView}
            downloadFile={downloadFile}
        />
    )
}

export default OneDriveUploader
