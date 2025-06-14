'use client'

import React from 'react'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { useRootContext } from '../context/RootContext'

export function ToastProvider({ children }: React.PropsWithChildren) {
    const {
        toastContainerId,
        props: { dark },
    } = useRootContext()
    return (
        <>
            {children}
            <ToastContainer
                position="bottom-center"
                className="!upup-relative !upup-bottom-2 !upup-left-1/2 !upup-w-[320px] !upup-max-w-[90%] !-upup-translate-x-1/2"
                limit={2}
                theme={dark ? 'dark' : 'light'}
                containerId={`upup-toast-container-${toastContainerId}`}
                progressClassName="upup-h-0"
                hideProgressBar
                newestOnTop
                stacked
            />
        </>
    )
}
