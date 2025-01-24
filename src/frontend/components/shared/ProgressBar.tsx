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
    { progress, className, showValue = false, ...rest },
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
                        rest.progressBarClassName,
                        classNames.progressBar,
                    )}
                >
                    <div
                        className={cn(
                            'h-full rounded-[4px]',
                            classNames.progressBarInner,
                        )}
                        style={{
                            width: progress + '%',
                            background: progress == 100 ? '#8EA5E7' : '#C5CAFB',
                        }}
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
