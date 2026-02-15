import React from 'react'
import { useRootContext } from '../../context/RootContext'
import { cn } from '../../lib/tailwind'
import AdapterViewContainer from './AdapterViewContainer'

type Props = {
    providerName: string
    onRetry: () => void
    icon?: React.ReactNode
}

export default function DriveAuthFallback({
    providerName,
    onRetry,
    icon,
}: Readonly<Props>) {
    const {
        props: { dark, classNames },
    } = useRootContext()

    return (
        <AdapterViewContainer>
            <div className="upup-flex upup-h-full upup-w-full upup-flex-col upup-items-center upup-justify-center upup-gap-4 upup-p-6 upup-text-center">
                <p
                    className={cn(
                        'upup-text-sm upup-text-[#333]',
                        {
                            'upup-text-[#FAFAFA] dark:upup-text-[#FAFAFA]':
                                dark,
                        },
                        classNames.adapterView,
                    )}
                >
                    Authenticate with {providerName} to select files for upload
                </p>
                <button
                    type="button"
                    className={cn(
                        'upup-rounded-md upup-bg-blue-600 upup-px-4 upup-py-2 upup-text-sm upup-font-medium upup-text-white upup-transition-all upup-duration-300 hover:upup-bg-blue-700',
                        {
                            'upup-bg-[#30C5F7] hover:upup-bg-[#1eb4e6] dark:upup-bg-[#30C5F7] dark:hover:upup-bg-[#1eb4e6]':
                                dark,
                        },
                    )}
                    onClick={onRetry}
                >
                    <span className="upup-inline-flex upup-items-center upup-gap-2">
                        {icon && (
                            <span className="upup-inline-flex upup-h-5 upup-w-5 [&>svg]:upup-h-full [&>svg]:upup-w-full">
                                {icon}
                            </span>
                        )}
                        Sign in with {providerName}
                    </span>
                </button>
            </div>
        </AdapterViewContainer>
    )
}
