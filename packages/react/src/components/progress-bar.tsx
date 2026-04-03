'use client'

import React, { forwardRef, HTMLAttributes } from 'react'
import { cn } from '../lib/tailwind'

type Props = {
    progress: number
    showValue?: boolean
    progressBarClassName?: string
} & HTMLAttributes<HTMLDivElement>

export default forwardRef<HTMLDivElement, Props>(function ProgressBar(
    {
        progress,
        className,
        progressBarClassName,
        showValue = false,
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
            )}
            data-upup-slot="progressBar.root"
            {...rest}
        >
            <div
                className={cn(
                    'upup-h-[6px] upup-flex-1 upup-overflow-hidden upup-rounded-[4px]',
                    progressBarClassName,
                )}
                style={{ backgroundColor: 'var(--upup-color-surface-alt)' }}
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Upload progress"
                data-upup-slot="progressBar.track"
            >
                <div
                    style={{
                        width: progress + '%',
                        backgroundColor: 'var(--upup-color-primary)',
                    }}
                    className="upup-h-full"
                    data-upup-slot="progressBar.fill"
                />
            </div>
            {showValue && (
                <p
                    className="upup-text-xs upup-font-semibold"
                    style={{ color: 'var(--upup-color-text)' }}
                    data-upup-slot="progressBar.text"
                >
                    {progress}%
                </p>
            )}
        </div>
    )
})
