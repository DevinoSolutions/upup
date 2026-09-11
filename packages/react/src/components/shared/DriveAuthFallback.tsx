import React, { useEffect, useRef } from 'react'
import { type DriveBrowserError, formatUiMessage as t } from '@useupup/core'
import { cn, driveErrorText } from '@useupup/core/internal'
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

    // One-shot auto sign-in: the provider tile click carries a transient user
    // activation (~5s in modern browsers), so kicking the OAuth popup off on
    // mount goes straight to the provider instead of an interstitial. If the
    // popup is blocked (activation consumed/expired), this view stays as the
    // manual fallback. Never auto-retries after an error.
    //
    // `error` is what makes that guard reachable across a REMOUNT (#390): this
    // view unmounts while an attempt is in flight and comes back with a fresh
    // `attemptedRef`, so only a caller that hands the outcome back can stop the
    // second `window.open` — which has no user activation left, returns null,
    // and gets reported as a popup block over a choice the person made. All four
    // drive components now forward it, and every way an attempt can end without
    // a session sets it.
    const attemptedRef = useRef(false)
    useEffect(() => {
        if (attemptedRef.current || error) return
        attemptedRef.current = true
        onRetry()
    }, [error, onRetry])

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
                        {t(tr.driveLoadError, {
                            message: driveErrorText(error, tr),
                        })}
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
                        'upup-rounded-md upup-bg-[#0ea5e9] upup-px-4 upup-py-2 upup-text-sm upup-font-medium upup-text-white upup-transition-all upup-duration-300 hover:upup-bg-[#0284c7]',
                        {
                            'upup-bg-[#38bdf8] hover:upup-bg-[#0ea5e9] dark:upup-bg-[#38bdf8] dark:hover:upup-bg-[#0ea5e9]':
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
