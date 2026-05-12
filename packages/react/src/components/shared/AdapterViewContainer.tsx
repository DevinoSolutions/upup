import React, { HTMLAttributes, PropsWithChildren } from 'react'
import { useUploaderTheme } from '../../context/RootContext'
import { cn } from '../../lib/tailwind'

export default function AdapterViewContainer({
    children,
    isLoading = false,
    ...rest
}: PropsWithChildren<{ isLoading?: boolean } & HTMLAttributes<HTMLDivElement>>) {
    const { isDark: dark, slotOverrides: slotClasses } = useUploaderTheme()

    return (
        <div data-testid="upup-adapter-view"
            className={cn(
                'upup-flex upup-items-center upup-justify-center upup-overflow-hidden upup-bg-black/[0.075]',
                {
                    'upup-bg-white/10 upup-text-[#FAFAFA] dark:upup-bg-white/10 dark:upup-text-[#FAFAFA]':
                        isLoading && dark,
                    [slotClasses.adapterView!]:
                        !isLoading && slotClasses.adapterView,
                    [slotClasses.driveLoading!]:
                        isLoading && slotClasses.driveLoading,
                },
            )}
            {...rest}
        >
            {children}
        </div>
    )
}
