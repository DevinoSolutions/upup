import React from 'react'
import { useUploaderRuntime, useUploaderSource } from '../context/RootContext'
import { useDropbox } from '../hooks/useDropbox'
import DriveAuthFallback from './shared/DriveAuthFallback'
import DriveBrowser from './shared/DriveBrowser'
import ServerModeDriveUploader from './ServerModeDriveUploader'

export default function DropboxUploader() {
    const { mode } = useUploaderRuntime()
    const { setActiveAdapter } = useUploaderSource()
    if (mode === 'server') {
        return (
            <ServerModeDriveUploader
                provider="dropbox"
                onBack={() => setActiveAdapter(undefined)}
            />
        )
    }
    return <ClientDropboxUploader />
}

function ClientDropboxUploader() {
    const {
        user,
        dropboxFiles: driveFiles,
        logout,
        token,
        isAuthenticated,
        authenticate,
        isLoading,
        ...uploaderProps
    } = useDropbox()

    const handleSignOut = async () => {
        logout()
        return Promise.resolve()
    }

    if (!isAuthenticated && !token && !isLoading) {
        return (
            <DriveAuthFallback
                providerName="Dropbox"
                onRetry={authenticate}
                data-upup-slot="dropbox-uploader"
            />
        )
    }

    return (
        <DriveBrowser
            driveFiles={driveFiles as any}
            user={user}
            handleSignOut={handleSignOut}
            data-upup-slot="dropbox-uploader"
            {...(uploaderProps as any)}
        />
    )
}
