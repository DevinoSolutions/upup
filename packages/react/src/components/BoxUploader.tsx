'use client'
import React, { useEffect } from 'react'
import { useBox } from '../hooks/useBox'
import useBoxUploader from '../hooks/useBoxUploader'
import DriveBrowser from './shared/DriveBrowser'

export default function BoxUploader() {
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
