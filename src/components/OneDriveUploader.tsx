import { Dispatch, FC, SetStateAction, useEffect } from 'react'
import { BaseConfigs, OneDriveConfigs } from 'types'
import useOneDriveAuth from '../hooks/useOneDriveAuth'

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
const OneDriveUploader: FC<Props> = ({ oneDriveConfigs }: Props) => {
    const { handleSignIn } = useOneDriveAuth(oneDriveConfigs.onedrive_client_id)

    useEffect(() => {
        ;(async () => await handleSignIn())()
    }, [])

    return (
        <></>
        // <FileBrowser
        //     googleFiles={googleFiles}
        //     handleSignOut={handleSignOut}
        //     user={user}
        //     downloadFile={downloadFile}
        //     setFiles={setFiles}
        //     setView={setView}
        //     accept={accept || '*'}
        // />
    )
}

export default OneDriveUploader
