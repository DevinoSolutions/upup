import React, { HTMLAttributes, PropsWithChildren } from 'react'
import { useUploaderTheme } from '../../context/UploaderContext'
import { cn } from '@upupjs/core/internal'

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
                // Transparent by design: the view body sits directly on the
                // panel's gradient chrome (the old black/[0.075] wash read as
                // a mismatched gray block over the light gradient).
                'upup-flex upup-items-center upup-justify-center upup-overflow-hidden',
                {
                    'upup-text-[#FAFAFA] dark:upup-text-[#FAFAFA]':
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
