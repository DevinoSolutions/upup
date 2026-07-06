import React, { HTMLAttributes, PropsWithChildren } from 'react'
import { useUploaderTheme } from '../../context/UploaderContext'
import { cn } from '@upup/core/internal'

export default function SourceViewContainer({
    children,
    isLoading = false,
    ...rest
}: PropsWithChildren<
    { isLoading?: boolean } & HTMLAttributes<HTMLDivElement>
>): React.ReactElement | null {
    const { isDark: dark, slotOverrides: slotClasses } = useUploaderTheme()

    return (
        <div
            data-testid="upup-source-view"
            className={cn(
                'upup-flex upup-items-center upup-justify-center upup-overflow-hidden upup-bg-black/[0.075]',
                {
                    'upup-bg-white/10 upup-text-[#FAFAFA] dark:upup-bg-white/10 dark:upup-text-[#FAFAFA]':
                        isLoading && dark,
                    [slotClasses.sourceView ?? '']:
                        !isLoading && slotClasses.sourceView,
                    [slotClasses.driveLoading ?? '']:
                        isLoading && slotClasses.driveLoading,
                },
            )}
            {...rest}
        >
            {children}
        </div>
    )
}
