'use client'

import { motion } from 'framer-motion'
import React from 'react'
import { useUploaderContext } from '../context/uploader-context'
import useMainBox from '../hooks/use-main-box'
import { cn } from '../lib/tailwind'

// TODO: Compose SourceSelector, SourceView, FileList inside DropZone (Task 3.8)

export type DropZoneProps = {
    children?: React.ReactNode
    className?: string
}

export default function DropZone({ children, className }: DropZoneProps) {
    const { files, activeSource, dark } = useUploaderContext()
    const {
        isDragging,
        absoluteIsDragging,
        absoluteHasBorder,
        handleDragOver,
        handleDragLeave,
        handleDrop,
        handlePaste,
    } = useMainBox()

    return (
        <motion.div
            key="drop-zone"
            className={cn(
                'upup-relative upup-flex-1 upup-overflow-hidden upup-rounded-lg',
                {
                    'upup-border upup-border-[#1849D6]': absoluteHasBorder,
                    'upup-border-[#30C5F7] dark:upup-border-[#30C5F7]':
                        absoluteHasBorder && dark,
                    'upup-border-dashed': !isDragging,
                    'upup-bg-[#E7ECFC] upup-backdrop-blur-sm':
                        absoluteIsDragging && !dark,
                    'upup-bg-[#045671] upup-backdrop-blur-sm dark:upup-bg-[#045671]':
                        absoluteIsDragging && dark,
                },
                className,
            )}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="region"
            aria-label="Drop files here or click to browse"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onPaste={handlePaste}
        >
            {children}
        </motion.div>
    )
}
