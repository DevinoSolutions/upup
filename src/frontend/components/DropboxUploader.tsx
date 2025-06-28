import React, { useEffect } from 'react'
import { useDropbox } from '../hooks/useDropbox'
import useDropboxUploader from '../hooks/useDropboxUploader'
import DriveBrowser from './shared/DriveBrowser'

export default function DropboxUploader() {
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
            {...(props as any)}
        />
    )
}
