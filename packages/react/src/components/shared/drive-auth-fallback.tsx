'use client'

import React from 'react'
import { useUploaderContext } from '../../context/uploader-context'

type Props = {
    providerName: string
    onRetry: () => void
}

export default function DriveAuthFallback({
    providerName,
    onRetry,
}: Readonly<Props>) {
    const { t } = useUploaderContext()

    return (
        <div className="upup-flex upup-h-full upup-w-full upup-items-center upup-justify-center" data-upup-slot="driveAuthFallback.root">
            <div className="upup-flex upup-h-full upup-w-full upup-flex-col upup-items-center upup-justify-center upup-gap-4 upup-p-6 upup-text-center">
                <p
                    className="upup-text-sm"
                    style={{ color: 'var(--upup-color-text)' }}
                >
                    {t('driveBrowser.authenticatePrompt', { provider: providerName })}
                </p>
                <button
                    type="button"
                    className="upup-rounded-md upup-px-4 upup-py-2 upup-text-sm upup-font-medium upup-text-white upup-transition-all upup-duration-300"
                    style={{ backgroundColor: 'var(--upup-color-primary)' }}
                    onClick={onRetry}
                >
                    {t('driveBrowser.signInWith', { provider: providerName })}
                </button>
            </div>
        </div>
    )
}
