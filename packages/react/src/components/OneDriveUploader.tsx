import React from 'react'
import { useRootContext } from '../context/RootContext'
import useOneDrive from '../hooks/useOneDrive'

import useOneDriveUploader from '../hooks/useOneDriveUploader'
import DriveAuthFallback from './shared/DriveAuthFallback'
import DriveBrowser from './shared/DriveBrowser'
import ServerModeDriveUploader from './ServerModeDriveUploader'

export default function OneDriveUploader() {
    const { mode, oneDriveConfigs, setActiveAdapter } = useRootContext()
    if (mode === 'server') {
        return (
            <ServerModeDriveUploader
                provider="onedrive"
                onBack={() => setActiveAdapter(undefined)}
            />
        )
    }
    return <ClientOneDriveUploader />
}

function ClientOneDriveUploader() {
    const { oneDriveConfigs } = useRootContext()
    const {
        user,
        oneDriveFiles: driveFiles,
        signOut: handleSignOut,
        graphClient,
        token,
        authCancelled,
        retryAuth,
        isInitialized,
        isAuthenticating,
        isAuthInProgress,
    } = useOneDrive(oneDriveConfigs?.onedrive_client_id)
    const props = useOneDriveUploader(graphClient)

    if (
        !token &&
        (authCancelled ||
            (isInitialized && !isAuthenticating && !isAuthInProgress))
    ) {
        return (
            <DriveAuthFallback
                providerName="OneDrive"
                onRetry={retryAuth}
                data-upup-slot="onedrive-uploader"
            />
        )
    }

    return (
        <DriveBrowser
            driveFiles={driveFiles}
            user={user}
            handleSignOut={handleSignOut}
            data-upup-slot="onedrive-uploader"
            {...props}
        />
    )
}
