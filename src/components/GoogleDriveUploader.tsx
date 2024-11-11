import FileBrowser from 'components/UpupUploader/FileBrowser'
import { useConfigContext } from 'context/config-context'
import { useGoogleDrive } from 'hooks'
import { memo } from 'react'

export default memo(function GoogleDriveUploader() {
    const { adaptersConfigs } = useConfigContext()
    const { googleFiles, handleSignOut, user, downloadFile } = useGoogleDrive(
        adaptersConfigs?.googleDrive!,
    )

    return (
        <FileBrowser
            driveFiles={googleFiles}
            handleSignOut={handleSignOut}
            user={user}
            downloadFile={downloadFile}
        />
    )
})
