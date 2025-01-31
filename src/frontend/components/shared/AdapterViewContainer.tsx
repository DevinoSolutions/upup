import React, { PropsWithChildren } from 'react'
import { useRootContext } from '../../context/RootContext'
import { cn } from '../../lib/tailwind'

export default function AdapterViewContainer({
    children,
    isLoading = false,
}: PropsWithChildren<{ isLoading?: boolean }>) {
    const {
        props: { dark, classNames },
    } = useRootContext()

    return (
        <div
            className={cn(
                'flex items-center justify-center overflow-hidden bg-black/[0.075]',
                {
                    'bg-white/10 text-[#FAFAFA] dark:bg-white/10 dark:text-[#FAFAFA]':
                        isLoading && dark,
                    [classNames.adapterView!]:
                        !isLoading && classNames.adapterView,
                    [classNames.driveLoading!]:
                        isLoading && classNames.driveLoading,
                },
            )}
        >
            {children}
        </div>
    )
}
