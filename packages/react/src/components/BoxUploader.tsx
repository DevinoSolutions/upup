'use client'
import React, { useEffect } from 'react'
import { useRootContext } from '../context/RootContext'
import { useBox } from '../hooks/useBox'
import useBoxUploader from '../hooks/useBoxUploader'
import DriveBrowser from './shared/DriveBrowser'
import ServerModeDriveUploader from './ServerModeDriveUploader'

export default function BoxUploader() {
    const { mode, setActiveAdapter } = useRootContext()
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

    useEffect(() => {
        if (!isAuthenticated && !token && !isLoading) {
            authenticate()
        }
    }, [isAuthenticated, token, isLoading, authenticate])

    const props = useBoxUploader(token)

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
