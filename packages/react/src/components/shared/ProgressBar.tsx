import React, { forwardRef, HTMLAttributes } from 'react'
import {
    useUploaderI18n,
    useUploaderTheme,
    useUploaderUploadControls,
} from '../../context/UploaderContext'
import { cn, isUploadActive } from '@upup/core/internal'

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
                        'upup-h-[6px] upup-flex-1 upup-overflow-hidden upup-rounded-[4px] upup-bg-[#F5F5F5]',
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
                            'upup-h-full upup-bg-[#8EA5E7]',
                            slotClasses.progressBarInner,
                            themeSlots?.progressBar?.fill,
                        )}
                    />
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
