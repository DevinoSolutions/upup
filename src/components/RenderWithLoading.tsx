import { CircularProgress } from '@mui/material'
import { useConfigContext } from 'context/config-context'
import { PropsWithChildren, memo } from 'react'

export default memo(function RenderWithLoading({
    children,
    isLoading,
}: PropsWithChildren<{ isLoading: boolean }>) {
    const { loader } = useConfigContext()
    if (isLoading) return loader ? <>{loader}</> : <CircularProgress />

    return <>{children}</>
})
