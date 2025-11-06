import React from 'react'
import { useRootContext } from '../context/RootContext'
import useOneDrive from '../hooks/useOneDrive'

import useOneDriveUploader from '../hooks/useOneDriveUploader'
import DriveBrowser from './shared/DriveBrowser'

export default function OneDriveUploader() {
    const { oneDriveConfigs } = useRootContext()
    const {
        user,
        oneDriveFiles: driveFiles,
        signOut: handleSignOut,
        graphClient,
    } = useOneDrive(oneDriveConfigs?.onedrive_client_id)
    const props = useOneDriveUploader(graphClient)

    return (
        <DriveBrowser
            driveFiles={driveFiles}
            user={user}
            handleSignOut={handleSignOut}
            {...props}
        />
    )
}
