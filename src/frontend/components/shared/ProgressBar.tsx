import React, { forwardRef, HTMLAttributes } from 'react'
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
    return (
        <ShouldRender if={!!progress}>
            <div
                ref={ref}
                className={cn('flex items-center gap-2', className)}
                {...rest}
            >
                <div
                    className={cn(
                        'h-[6px] flex-1 bg-[#F5F5F5]',
                        rest.progressBarClassName,
                    )}
                >
                    <div
                        className="h-full rounded-[4px]"
                        style={{
                            width: progress + '%',
                            background: progress == 100 ? '#8EA5E7' : '#C5CAFB',
                        }}
                    />
                </div>
                <ShouldRender if={!!showValue}>
                    <p className="text-xs font-semibold">{progress}%</p>
                </ShouldRender>
            </div>
        </ShouldRender>
    )
})
