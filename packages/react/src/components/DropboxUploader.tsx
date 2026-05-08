'use client'
import React from 'react'
import { useRootContext } from '../context/RootContext'
import { useDropbox } from '../hooks/useDropbox'
import useDropboxUploader from '../hooks/useDropboxUploader'
import DriveAuthFallback from './shared/DriveAuthFallback'
import DriveBrowser from './shared/DriveBrowser'
import ServerModeDriveUploader from './ServerModeDriveUploader'

export default function DropboxUploader() {
    const { mode, setActiveAdapter } = useRootContext()
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
    } = useDropbox()

    const handleSignOut = async () => {
        logout()
        return Promise.resolve()
    }

    const props = useDropboxUploader(token)

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
            {...(props as any)}
        />
    )
}
