import React from 'react'
import { type DriveBrowserError, formatUiMessage as t } from '@upupjs/core'
import { cn } from '@upupjs/core/internal'
import {
    useUploaderI18n,
    useUploaderTheme,
} from '../../context/UploaderContext'
import SourceViewContainer from './SourceViewContainer'

type Props = {
    providerName: string
    onRetry: () => void
    /** initGis degradation (F-124) — missing config / GIS failed to attach. */
    error?: DriveBrowserError | undefined
    'data-upup-slot'?: string | undefined
}

export default function DriveAuthFallback({
    providerName,
    onRetry,
    error,
    'data-upup-slot': dataUpupSlot = 'drive-auth-fallback',
}: Readonly<Props>): React.ReactElement | null {
    const { isDark: dark, slotOverrides: slotClasses } = useUploaderTheme()
    const { translations: tr } = useUploaderI18n()

    return (
        <SourceViewContainer data-upup-slot={dataUpupSlot}>
            <div className="upup-flex upup-h-full upup-w-full upup-flex-col upup-items-center upup-justify-center upup-gap-4 upup-p-6 upup-text-center">
                {!!error && (
                    <p
                        data-testid="upup-drive-error"
                        data-upup-slot="drive-error"
                        role="alert"
                        className="upup-p-4 upup-text-sm upup-text-red-600 dark:upup-text-red-400"
                    >
                        {t(tr.driveLoadError, { message: error.message })}
                    </p>
                )}
                <p
                    className={cn(
                        'upup-text-sm upup-text-[#333]',
                        {
                            'upup-text-[#FAFAFA] dark:upup-text-[#FAFAFA]':
                                dark,
                        },
                        slotClasses.sourceView,
                    )}
                >
                    {t(tr.authenticatePrompt, { provider: providerName })}
                </p>
                <button
                    type="button"
                    className={cn(
                        'upup-rounded-md upup-bg-blue-600 upup-px-4 upup-py-2 upup-text-sm upup-font-medium upup-text-white upup-transition-all upup-duration-300 hover:upup-bg-blue-700',
                        {
                            'upup-bg-[#30C5F7] hover:upup-bg-[#1eb4e6] dark:upup-bg-[#30C5F7] dark:hover:upup-bg-[#1eb4e6]':
                                dark,
                        },
                    )}
                    onClick={onRetry}
                >
                    {t(tr.signInWith, { provider: providerName })}
                </button>
            </div>
        </SourceViewContainer>
    )
}
