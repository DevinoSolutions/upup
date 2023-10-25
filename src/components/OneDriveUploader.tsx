import { Dispatch, FC, SetStateAction } from 'react'
import { BaseConfigs, OneDriveConfigs } from 'types'
import useOneDrive from '../hooks/useOneDrive'

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
    baseConfigs: { multiple: multiSelect },
    oneDriveConfigs,
    setFiles,
    setView,
}: Props) => {
    // const { oneDriveFiles, handleSignOut, user, downloadFile } =
    const { token } = useOneDrive(oneDriveConfigs)
    setFiles([])
    setView('oneDrive')
    token && console.log(token)
    multiSelect && console.log(multiSelect)

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
