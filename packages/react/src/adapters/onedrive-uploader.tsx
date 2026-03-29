'use client'

import React from 'react'
import { useUploaderContext } from '../context/uploader-context'
import DriveAuthFallback from '../components/shared/drive-auth-fallback'
import DriveBrowser from '../components/shared/drive-browser'
import useOneDrive from '../hooks/use-onedrive'
import useOneDriveUploader from '../hooks/use-onedrive-uploader'

export default function OneDriveUploader() {
    const ctx = useUploaderContext()
    const oneDriveConfigs =
        (ctx as any)?.core?.options?.oneDriveConfigs ?? {}
    const clientId = oneDriveConfigs?.onedrive_client_id ?? ''

    const {
        user,
        oneDriveFiles: driveFiles,
        signOut: handleSignOut,
        token,
        authCancelled,
        retryAuth,
    } = useOneDrive(clientId)

    const props = useOneDriveUploader(token)

    if (authCancelled && !token) {
        return <DriveAuthFallback providerName="OneDrive" onRetry={retryAuth} />
    }

    return (
        <DriveBrowser
            driveFiles={driveFiles}
            user={user}
            handleSignOut={handleSignOut}
            {...props}
        />
    )
}
