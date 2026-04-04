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
    const { files, activeSource, resolvedTheme } = useUploaderContext()
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
                'upup-relative upup-flex-1 upup-overflow-hidden upup-rounded-lg upup-border upup-transition-colors',
                {
                    'upup-border-dashed': !isDragging,
                    'upup-border-solid': isDragging,
                    'upup-backdrop-blur-sm': absoluteIsDragging,
                },
                className,
            )}
            style={{
                borderColor: isDragging
                    ? 'var(--upup-color-border-active)'
                    : 'var(--upup-color-border)',
                backgroundColor: absoluteIsDragging
                    ? 'var(--upup-color-drag-bg)'
                    : undefined,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="region"
            aria-label="Drop files here or click to browse"
            aria-dropeffect={isDragging ? 'copy' : 'none'}
            data-upup-slot="dropZone.root"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onPaste={handlePaste}
        >
            {children}
        </motion.div>
    )
}
