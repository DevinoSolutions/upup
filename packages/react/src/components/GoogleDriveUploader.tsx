import React from 'react'
import { useRootContext } from '../context/RootContext'
import useGoogleDrive from '../hooks/useGoogleDrive'

import useGoogleDriveUploader from '../hooks/useGoogleDriveUploader'
import DriveAuthFallback from './shared/DriveAuthFallback'
import DriveBrowser from './shared/DriveBrowser'
import ServerModeDriveUploader from './ServerModeDriveUploader'

export default function GoogleDriveUploader() {
    const { mode, setActiveAdapter } = useRootContext()
    if (mode === 'server') {
        return (
            <ServerModeDriveUploader
                provider="google-drive"
                onBack={() => setActiveAdapter(undefined)}
            />
        )
    }
    return <ClientGoogleDriveUploader />
}

function ClientGoogleDriveUploader() {
    const { googleDriveConfigs } = useRootContext()
    const {
        user,
        googleFiles: driveFiles,
        handleSignOut,
        token,
        authCancelled,
        retryAuth,
        isAuthReady,
    } = useGoogleDrive(googleDriveConfigs)
    const props = useGoogleDriveUploader(token)

    if (!token && (authCancelled || isAuthReady)) {
        return (
            <DriveAuthFallback
                providerName="Google Drive"
                onRetry={retryAuth}
                data-upup-slot="google-drive-uploader"
            />
        )
    }

    return (
        <DriveBrowser
            driveFiles={driveFiles}
            user={user}
            handleSignOut={handleSignOut}
            data-upup-slot="google-drive-uploader"
            {...props}
        />
    )
}
