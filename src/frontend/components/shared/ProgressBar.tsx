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
                >
                    <div
                        style={{
                            width: progress + '%',
                        }}
                        className={cn(
                            'upup-h-full upup-bg-[#8EA5E7]',
                            classNames.progressBarInner,
                        )}
                    />
                </div>
                <ShouldRender if={!!showValue}>
                    <p
                        className={cn(
                            'upup-text-xs upup-font-semibold',
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
