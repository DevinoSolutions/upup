import React from 'react'
import {
    useUploaderRuntime,
    useUploaderSource,
} from '../context/UploaderContext'
import useOneDrive from '../hooks/useOneDrive'
import DriveAuthFallback from './shared/DriveAuthFallback'
import DriveBrowser from './shared/DriveBrowser'
import ServerModeDriveUploader from './ServerModeDriveUploader'

export default function OneDriveUploader(): React.ReactElement | null {
    const { mode } = useUploaderRuntime()
    const { setActiveSource } = useUploaderSource()
    if (mode === 'server') {
        return (
            <ServerModeDriveUploader
                provider="onedrive"
                onBack={() => { setActiveSource(undefined); }}
            />
        )
    }
    return <ClientOneDriveUploader />
}

function ClientOneDriveUploader() {
    const {
        user,
        oneDriveFiles: driveFiles,
        signOut,
        token,
        isAuthenticated,
        authenticate,
        isLoading,
        ...uploaderProps
    } = useOneDrive()

    const handleSignOut = async () => {
        signOut()
        return Promise.resolve()
    }

    if (!isAuthenticated && !token && !isLoading) {
        return (
            <DriveAuthFallback
                providerName="OneDrive"
                onRetry={authenticate}
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
            {...uploaderProps}
        />
    )
}
