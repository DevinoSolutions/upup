import React from 'react'
import {
    useUploaderRuntime,
    useUploaderSource,
} from '../context/UploaderContext'
import { useDropbox } from '../hooks/useDropbox'
import DriveAuthFallback from './shared/DriveAuthFallback'
import DriveBrowser from './shared/DriveBrowser'
import ServerModeDriveUploader from './ServerModeDriveUploader'

export default function DropboxUploader(): React.ReactElement | null {
    const { mode } = useUploaderRuntime()
    const { setActiveSource } = useUploaderSource()
    if (mode === 'server') {
        return (
            <ServerModeDriveUploader
                provider="dropbox"
                onBack={() => { setActiveSource(undefined); }}
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
            driveFiles={driveFiles}
            user={user}
            handleSignOut={handleSignOut}
            data-upup-slot="dropbox-uploader"
            {...uploaderProps}
        />
    )
}
