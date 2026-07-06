import React from 'react'
import {
    useUploaderRuntime,
    useUploaderSource,
} from '../context/UploaderContext'
import useGoogleDrive from '../hooks/useGoogleDrive'
import DriveAuthFallback from './shared/DriveAuthFallback'
import DriveBrowser from './shared/DriveBrowser'
import ServerModeDriveUploader from './ServerModeDriveUploader'

export default function GoogleDriveUploader(): React.ReactElement | null {
    const { mode } = useUploaderRuntime()
    const { setActiveSource } = useUploaderSource()
    if (mode === 'server') {
        return (
            <ServerModeDriveUploader
                provider="google-drive"
                onBack={() => {
                    setActiveSource(undefined)
                }}
            />
        )
    }
    return <ClientGoogleDriveUploader />
}

function ClientGoogleDriveUploader() {
    const {
        user,
        googleFiles: driveFiles,
        handleSignOut,
        token,
        authCancelled,
        retryAuth,
        isAuthReady,
        error,
        ...uploaderProps
    } = useGoogleDrive()

    if (!token && (authCancelled || isAuthReady)) {
        return (
            <DriveAuthFallback
                providerName="Google Drive"
                onRetry={retryAuth}
                error={error}
                data-upup-slot="google-drive-uploader"
            />
        )
    }

    return (
        <DriveBrowser
            driveFiles={driveFiles}
            user={user}
            handleSignOut={handleSignOut}
            error={error}
            data-upup-slot="google-drive-uploader"
            {...uploaderProps}
        />
    )
}
