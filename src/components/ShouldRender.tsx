import { PropsWithChildren } from 'react'

export default function ShouldRender({
    children,
    if: condition,
}: PropsWithChildren<{ if: boolean }>) {
    if (!condition) return null

    return <>{children}</>
}
