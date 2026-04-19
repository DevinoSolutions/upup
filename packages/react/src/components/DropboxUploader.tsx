'use client'
import React, { useEffect } from 'react'
import { useRootContext } from '../context/RootContext'
import { useDropbox } from '../hooks/useDropbox'
import useDropboxUploader from '../hooks/useDropboxUploader'
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

    useEffect(() => {
        if (!isAuthenticated && !token && !isLoading) {
            authenticate()
        }
    }, [isAuthenticated, token, isLoading, authenticate])

    const props = useDropboxUploader(token)

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
