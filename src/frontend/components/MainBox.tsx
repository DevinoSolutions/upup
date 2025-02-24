import { motion } from 'framer-motion'
import React from 'react'
import { ToastContainer } from 'react-toastify'
import { useRootContext } from '../context/RootContext'
import useMainBox from '../hooks/useMainBox'
import { cn } from '../lib/tailwind'
import AdapterSelector from './AdapterSelector'
import AdapterView from './AdapterView'
import FileList from './FileList'
import MyAnimatePresence from './shared/MyAnimatePresence'
import ShouldRender from './shared/ShouldRender'

export default function MainBox() {
    const {
        files,
        activeAdapter,
        isAddingMore,
        toastContainerId,
        props: { dark },
    } = useRootContext()
    const {
        isDragging,
        absoluteIsDragging,
        absoluteHasBorder,
        handleDragOver,
        handleDragLeave,
        handleDrop,
    } = useMainBox()

    return (
        <MyAnimatePresence>
            <motion.div
                key="adapter-selector"
                className={cn(
                    'relative flex-1 overflow-hidden rounded-lg [&_.Toastify]:absolute [&_.Toastify]:bottom-0 [&_.Toastify]:left-0 [&_.Toastify]:right-0 [&_.Toastify__toast-container]:relative',
                    {
                        'border border-[#1849D6]': absoluteHasBorder,
                        'border-[#30C5F7] dark:border-[#30C5F7]':
                            absoluteHasBorder && dark,
                        'border-dashed': !isDragging,
                        'bg-[#E7ECFC] backdrop-blur-sm':
                            absoluteIsDragging && !dark,
                        'bg-[#045671] backdrop-blur-sm dark:bg-[#045671]':
                            absoluteIsDragging && dark,
                    },
                )}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <ShouldRender if={!!activeAdapter}>
                    <AdapterView />
                </ShouldRender>
                <ShouldRender
                    if={!activeAdapter && (isAddingMore || !files.size)}
                >
                    <AdapterSelector />
                </ShouldRender>
                <FileList />

                <ShouldRender if={!!toastContainerId}>
                    <ToastContainer
                        position="bottom-center"
                        className="!relative !bottom-2 !left-1/2 !w-[320px] !max-w-[90%] !-translate-x-1/2"
                        limit={2}
                        theme={dark ? 'dark' : 'light'}
                        containerId={toastContainerId}
                        progressClassName="h-0"
                        hideProgressBar
                        newestOnTop
                        stacked
                    />
                </ShouldRender>
            </motion.div>
        </MyAnimatePresence>
    )
}
