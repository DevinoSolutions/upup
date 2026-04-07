import React, { HTMLAttributes, PropsWithChildren } from 'react'
import { useRootContext } from '../../context/RootContext'
import { cn } from '../../lib/tailwind'

export default function AdapterViewContainer({
    children,
    isLoading = false,
    ...rest
}: PropsWithChildren<{ isLoading?: boolean } & HTMLAttributes<HTMLDivElement>>) {
    const {
        props: { dark, classNames },
    } = useRootContext()

    return (
        <div data-testid="upup-adapter-view"
            className={cn(
                'upup-flex upup-items-center upup-justify-center upup-overflow-hidden upup-bg-black/[0.075]',
                {
                    'upup-bg-white/10 upup-text-[#FAFAFA] dark:upup-bg-white/10 dark:upup-text-[#FAFAFA]':
                        isLoading && dark,
                    [classNames.adapterView!]:
                        !isLoading && classNames.adapterView,
                    [classNames.driveLoading!]:
                        isLoading && classNames.driveLoading,
                },
            )}
            {...rest}
        >
            {children}
        </div>
    )
}
