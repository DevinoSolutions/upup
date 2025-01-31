import React, { forwardRef, HTMLAttributes } from 'react'
import { useRootContext } from '../../context/RootContext'
import { cn } from '../../lib/tailwind'
import ShouldRender from './ShouldRender'

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
        props: { classNames },
    } = useRootContext()
    return (
        <ShouldRender if={!!progress}>
            <div
                ref={ref}
                className={cn(
                    'flex items-center gap-2',
                    className,
                    classNames.progressBarContainer,
                )}
                {...rest}
            >
                <div
                    className={cn(
                        'h-[6px] flex-1 bg-[#F5F5F5]',
                        progressBarClassName,
                        classNames.progressBar,
                    )}
                >
                    <div
                        style={{
                            width: progress + '%',
                        }}
                        className={cn(
                            'h-full rounded-[4px] bg-[#8EA5E7]',
                            progressBarClassName,
                            classNames.progressBarInner,
                        )}
                    />
                </div>
                <ShouldRender if={!!showValue}>
                    <p
                        className={cn(
                            'text-xs font-semibold',
                            classNames.progressBarText,
                        )}
                    >
                        {progress}%
                    </p>
                </ShouldRender>
            </div>
        </ShouldRender>
    )
})
