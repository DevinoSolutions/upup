import React, { PropsWithChildren } from 'react'
import { useRootContext } from '../../context/RootContext'

export default function ShouldRender({
    children,
    if: condition,
    isLoading = false,
}: PropsWithChildren<{ if: boolean; isLoading?: boolean }>) {
    const {
        props: {
            icons: { LoaderIcon },
        },
    } = useRootContext()

    if (isLoading) return <LoaderIcon />
    if (!condition) return null

    return <>{children}</>
}
