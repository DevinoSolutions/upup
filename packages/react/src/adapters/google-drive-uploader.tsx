'use client'

import React from 'react'
import { useUploaderContext } from '../context/uploader-context'
import DriveAuthFallback from '../components/shared/drive-auth-fallback'
import DriveBrowser from '../components/shared/drive-browser'
import useGoogleDrive, { type GoogleDriveConfigs } from '../hooks/use-google-drive'
import useGoogleDriveUploader from '../hooks/use-google-drive-uploader'

export default function GoogleDriveUploader() {
    const ctx = useUploaderContext()
    // Configs come from core options if wired up, otherwise empty
    const googleDriveConfigs: GoogleDriveConfigs =
        (ctx as any)?.core?.options?.googleDriveConfigs ?? {}

    const {
        user,
        googleFiles: driveFiles,
        handleSignOut,
        token,
        authCancelled,
        retryAuth,
    } = useGoogleDrive(googleDriveConfigs)

    const props = useGoogleDriveUploader(
        token,
        googleDriveConfigs?.google_api_key,
    )

    if (authCancelled && !token) {
        return (
            <DriveAuthFallback
                providerName="Google Drive"
                onRetry={retryAuth}
            />
        )
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
