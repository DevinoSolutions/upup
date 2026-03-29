'use client'

import React, { useEffect } from 'react'
import { useUploaderContext } from '../context/uploader-context'
import DriveBrowser from '../components/shared/drive-browser'
import { useDropbox } from '../hooks/use-dropbox'
import useDropboxUploader from '../hooks/use-dropbox-uploader'

export default function DropboxUploader() {
    const ctx = useUploaderContext()
    const dropboxConfigs = ctx.core.options.dropboxConfigs

    const {
        user,
        dropboxFiles: driveFiles,
        logout,
        token,
        isAuthenticated,
        authenticate,
        isLoading,
    } = useDropbox(dropboxConfigs)

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
