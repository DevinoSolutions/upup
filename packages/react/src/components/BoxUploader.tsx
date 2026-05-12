import React from 'react'
import { useUploaderRuntime, useUploaderSource } from '../context/RootContext'
import { useBox } from '../hooks/useBox'
import useBoxUploader from '../hooks/useBoxUploader'
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
    const { user, boxFiles, token, isAuthenticated, isLoading, authenticate, logout } = useBox()

    const handleSignOut = async () => { logout(); return Promise.resolve() }

    const props = useBoxUploader(token)

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
            driveFiles={boxFiles as any}
            user={user}
            handleSignOut={handleSignOut}
            data-upup-slot="box-uploader"
            {...(props as any)}
        />
    )
}
