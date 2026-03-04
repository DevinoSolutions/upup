import React from 'react'
import { useRootContext } from '../context/RootContext'
import useGoogleDrive from '../hooks/useGoogleDrive'

import useGoogleDriveUploader from '../hooks/useGoogleDriveUploader'
import DriveAuthFallback from './shared/DriveAuthFallback'
import DriveBrowser from './shared/DriveBrowser'

export default function GoogleDriveUploader() {
    const { googleDriveConfigs } = useRootContext()
    const {
        user,
        googleFiles: driveFiles,
        handleSignOut,
        token,
        authCancelled,
        retryAuth,
    } = useGoogleDrive(googleDriveConfigs)
    const props = useGoogleDriveUploader(token)

    if (authCancelled && !token) {
        return (
            <DriveAuthFallback
                providerName="Google Drive"
                onRetry={retryAuth}
            />
        )
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
