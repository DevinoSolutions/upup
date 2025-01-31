import React from 'react'
import { useRootContext } from '../context/RootContext'
import useGoogleDrive from '../hooks/useGoogleDrive'

import useGoogleDriveUploader from '../hooks/useGoogleDriveUploader'
import DriveBrowser from './shared/DriveBrowser'

export default function GoogleDriveUploader() {
    const { googleDriveConfigs } = useRootContext()
    const {
        user,
        googleFiles: driveFiles,
        handleSignOut,
        token,
    } = useGoogleDrive(googleDriveConfigs)
    const props = useGoogleDriveUploader(token)

    return (
        <DriveBrowser
            driveFiles={driveFiles}
            user={user}
            handleSignOut={handleSignOut}
            {...props}
        />
    )
}
