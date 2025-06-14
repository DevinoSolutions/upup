import { motion } from 'framer-motion'
import React from 'react'
import { useRootContext } from '../context/RootContext'
import useMainBox from '../hooks/useMainBox'
import { cn } from '../lib/tailwind'
import AdapterSelector from './AdapterSelector'
import AdapterView from './AdapterView'
import FileList from './FileList'
import MyAnimatePresence from './shared/MyAnimatePresence'
import ShouldRender from './shared/ShouldRender'
import { ToastProvider } from './ToastProvider'
export default function MainBox() {
    const {
        files,
        activeAdapter,
        isAddingMore,
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
            <ToastProvider>
                <motion.div
                    key="adapter-selector"
                    className={cn(
                        'upup-relative upup-flex-1 upup-overflow-hidden upup-rounded-lg [&_.Toastify]:upup-absolute [&_.Toastify]:upup-bottom-0 [&_.Toastify]:upup-left-0 [&_.Toastify]:upup-right-0 [&_.Toastify__toast-container]:upup-relative',
                        {
                            'upup-border upup-border-[#1849D6]':
                                absoluteHasBorder,
                            'upup-border-[#30C5F7] dark:upup-border-[#30C5F7]':
                                absoluteHasBorder && dark,
                            'upup-border-dashed': !isDragging,
                            'upup-bg-[#E7ECFC] upup-backdrop-blur-sm':
                                absoluteIsDragging && !dark,
                            'upup-bg-[#045671] upup-backdrop-blur-sm dark:upup-bg-[#045671]':
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
                </motion.div>
            </ToastProvider>
        </MyAnimatePresence>
    )
}
