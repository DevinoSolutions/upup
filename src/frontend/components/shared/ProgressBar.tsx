import React, { forwardRef, HTMLAttributes } from 'react'
import ShouldRender from './ShouldRender'

type Props = {
    progress: number
    showValue?: boolean
} & HTMLAttributes<HTMLDivElement>

export default forwardRef<HTMLDivElement, Props>(function ProgressBar(
    { progress, className, showValue = false, ...rest },
    ref,
) {
    return (
        <ShouldRender if={!!progress}>
            <div
                ref={ref}
                className={className + ' flex items-center gap-2'}
                {...rest}
            >
                <div className="h-[6px] flex-1 rounded bg-[#F5F5F5]">
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
