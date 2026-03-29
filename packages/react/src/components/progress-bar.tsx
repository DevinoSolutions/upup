'use client'

import React, { forwardRef, HTMLAttributes } from 'react'
import { cn } from '../lib/tailwind'

type Props = {
    progress: number
    showValue?: boolean
    progressBarClassName?: string
    /** Optional class names for sub-elements */
    classNames?: {
        progressBarContainer?: string
        progressBar?: string
        progressBarInner?: string
        progressBarText?: string
    }
    dark?: boolean
} & HTMLAttributes<HTMLDivElement>

export default forwardRef<HTMLDivElement, Props>(function ProgressBar(
    {
        progress,
        className,
        progressBarClassName,
        showValue = false,
        classNames = {},
        dark,
        ...rest
    },
    ref,
) {
    if (!progress) return null

    return (
        <div
            ref={ref}
            className={cn(
                'upup-flex upup-items-center upup-gap-2',
                className,
                classNames.progressBarContainer,
            )}
            {...rest}
        >
            <div
                className={cn(
                    'upup-h-[6px] upup-flex-1 upup-overflow-hidden upup-rounded-[4px] upup-bg-[#F5F5F5]',
                    progressBarClassName,
                    classNames.progressBar,
                )}
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Upload progress"
            >
                <div
                    style={{ width: progress + '%' }}
                    className={cn(
                        'upup-h-full upup-bg-[#8EA5E7]',
                        classNames.progressBarInner,
                    )}
                />
            </div>
            {showValue && (
                <p
                    className={cn(
                        'upup-text-xs upup-font-semibold',
                        { 'upup-text-white': dark },
                        classNames.progressBarText,
                    )}
                >
                    {progress}%
                </p>
            )}
        </div>
    )
})
