import React, { PropsWithChildren } from 'react'
import { useUploaderOptions } from '../../context/RootContext'

export default function ShouldRender({
    children,
    if: condition,
    isLoading = false,
}: PropsWithChildren<{ if: boolean; isLoading?: boolean }>) {
    const { icons: { LoaderIcon } } = useUploaderOptions()

    if (isLoading) return <LoaderIcon />
    if (!condition) return null

    return <>{children}</>
}
