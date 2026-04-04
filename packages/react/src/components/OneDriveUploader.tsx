import React from 'react'
import { useRootContext } from '../context/RootContext'
import useOneDrive from '../hooks/useOneDrive'

import useOneDriveUploader from '../hooks/useOneDriveUploader'
import DriveAuthFallback from './shared/DriveAuthFallback'
import DriveBrowser from './shared/DriveBrowser'

export default function OneDriveUploader() {
    const { oneDriveConfigs } = useRootContext()
    const {
        user,
        oneDriveFiles: driveFiles,
        signOut: handleSignOut,
        graphClient,
        token,
        authCancelled,
        retryAuth,
    } = useOneDrive(oneDriveConfigs?.onedrive_client_id)
    const props = useOneDriveUploader(graphClient)

    if (authCancelled && !token) {
        return <DriveAuthFallback providerName="OneDrive" onRetry={retryAuth} />
    }

    return (
        <DriveBrowser
            driveFiles={driveFiles}
            user={user}
            handleSignOut={handleSignOut}
            {...props}
        />
    )
}
