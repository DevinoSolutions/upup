import React, { forwardRef, HTMLAttributes } from 'react'
import {
    useUploaderI18n,
    useUploaderTheme,
    useUploaderUploadControls,
} from '../../context/UploaderContext'
import { cn, isUploadActive } from '@upupjs/core/internal'

type Props = {
    progress: number
    showValue?: boolean
    progressBarClassName?: string
} & HTMLAttributes<HTMLDivElement>

export default forwardRef<HTMLDivElement, Props>(function ProgressBar(
    { progress, className, progressBarClassName, showValue = false, ...rest },
    ref,
) {
    const {
        isDark: dark,
        slotOverrides: slotClasses,
        slots: themeSlots,
    } = useUploaderTheme()
    const { translations: tr } = useUploaderI18n()
    const {
        upload: { uploadStatus },
    } = useUploaderUploadControls()
    return (
        (!!progress || isUploadActive(uploadStatus)) && (
            <div
                data-testid="upup-progress-bar"
                data-upup-slot="progress-bar"
                ref={ref}
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={tr.uploadProgress}
                className={cn(
                    'upup-flex upup-items-center upup-gap-2',
                    className,
                    slotClasses.progressBarContainer,
                    themeSlots?.progressBar?.root,
                )}
                {...rest}
            >
                <div
                    className={cn(
                        'upup-relative upup-h-[6px] upup-flex-1 upup-overflow-hidden upup-rounded-[4px]',
                        dark ? 'upup-bg-white/[0.12]' : 'upup-bg-[#F5F5F5]',
                        progressBarClassName,
                        slotClasses.progressBar,
                        themeSlots?.progressBar?.track,
                    )}
                >
                    <div
                        style={{
                            width: `${progress}%`,
                        }}
                        className={cn(
                            // fx-essential keeps the width tween alive under
                            // data-motion="off"; fx-progress-fill carries the
                            // transition. Sky accent replaces the legacy periwinkle.
                            'upup-fx-progress-fill upup-fx-essential upup-h-full',
                            dark ? 'upup-bg-[#38bdf8]' : 'upup-bg-[#0ea5e9]',
                            slotClasses.progressBarInner,
                            themeSlots?.progressBar?.fill,
                        )}
                    />
                    {isUploadActive(uploadStatus) && (
                        <div
                            aria-hidden="true"
                            className="upup-animate-fx-sheen upup-pointer-events-none upup-absolute upup-inset-y-0 upup-left-0 upup-w-2/5"
                            style={{
                                background:
                                    'linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)',
                            }}
                        />
                    )}
                </div>
                {showValue && (
                    <p
                        className={cn(
                            'upup-text-xs upup-font-semibold',
                            {
                                'upup-text-white': dark,
                            },
                            slotClasses.progressBarText,
                            themeSlots?.progressBar?.text,
                        )}
                    >
                        {progress}%
                    </p>
                )}
            </div>
        )
    )
})
