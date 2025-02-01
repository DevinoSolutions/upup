import { AnimatePresence, AnimatePresenceProps } from 'framer-motion'
import React, { JSX, PropsWithChildren } from 'react'

const AnimatePresenceTypeFixed = AnimatePresence as ({
    children,
    custom,
    initial,
    onExitComplete,
    presenceAffectsLayout,
    mode,
    propagate,
    anchorX,
}: React.PropsWithChildren<AnimatePresenceProps>) => JSX.Element

export default function MyAnimatePresence({
    children,
}: Readonly<PropsWithChildren>) {
    return <AnimatePresenceTypeFixed>{children}</AnimatePresenceTypeFixed>
}
