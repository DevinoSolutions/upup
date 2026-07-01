import React from 'react'
import { useUploaderRuntime, useUploaderSource } from '../context/UploaderContext'
import { useBox } from '../hooks/useBox'
import DriveAuthFallback from './shared/DriveAuthFallback'
import DriveBrowser from './shared/DriveBrowser'
import ServerModeDriveUploader from './ServerModeDriveUploader'

export default function BoxUploader() {
    const { mode } = useUploaderRuntime()
    const { setActiveAdapter } = useUploaderSource()
    if (mode === 'server') {
        return (
            <ServerModeDriveUploader
                provider="box"
                onBack={() => setActiveAdapter(undefined)}
            />
        )
    }
    return <ClientBoxUploader />
}

function ClientBoxUploader() {
    const {
        user,
        boxFiles: driveFiles,
        logout,
        token,
        isAuthenticated,
        authenticate,
        isLoading,
        ...uploaderProps
    } = useBox()

    const handleSignOut = async () => {
        logout()
        return Promise.resolve()
    }

    if (!isAuthenticated && !token && !isLoading) {
        return (
            <DriveAuthFallback
                providerName="Box"
                onRetry={authenticate}
                data-upup-slot="box-uploader"
            />
        )
    }

    return (
        <DriveBrowser
            driveFiles={driveFiles}
            user={user}
            handleSignOut={handleSignOut}
            data-upup-slot="box-uploader"
            {...uploaderProps}
        />
    )
}
