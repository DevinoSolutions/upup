'use client'

import React, { useContext } from 'react'
import dynamic from 'next/dynamic'
import { ThemeContext } from '@/lib/contexts'

// The container renders nothing until a toast fires (no server markup), and
// nothing on the landing pages fires one on load — so react-toastify loads in
// its own chunk after hydration instead of riding the first load.
const ToastContainer = dynamic(
    () => import('react-toastify').then(mod => mod.ToastContainer),
    { ssr: false },
)

export default function Toast() {
    const { isDarkMode } = useContext(ThemeContext)
    return (
        <ToastContainer
            limit={3}
            theme={isDarkMode ? 'dark' : 'light'}
            position="top-right"
            progressClassName="h-0"
            hideProgressBar
            newestOnTop
        />
    )
}
