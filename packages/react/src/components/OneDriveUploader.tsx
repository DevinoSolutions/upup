import React from 'react'
import { useUploaderRuntime, useUploaderSource } from '../context/RootContext'
import useOneDrive from '../hooks/useOneDrive'
import DriveAuthFallback from './shared/DriveAuthFallback'
import DriveBrowser from './shared/DriveBrowser'
import ServerModeDriveUploader from './ServerModeDriveUploader'

export default function OneDriveUploader() {
    const { mode } = useUploaderRuntime()
    const { setActiveAdapter } = useUploaderSource()
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
            driveFiles={driveFiles as any}
            user={user}
            handleSignOut={handleSignOut}
            data-upup-slot="onedrive-uploader"
            {...(uploaderProps as any)}
        />
    )
}
