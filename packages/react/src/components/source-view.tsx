'use client'

import { motion } from 'framer-motion'
import React from 'react'
import { useUploaderContext } from '../context/uploader-context'
import { uploadAdapterObject } from '../lib/constants'
import { cn } from '../lib/tailwind'

// TODO: Wire up real adapter components and icons (Task 3.8)

export type SourceViewProps = {
    className?: string
}

export default function SourceView({ className }: SourceViewProps) {
    const {
        activeSource,
        setActiveSource,
        mini,
        resolvedTheme,
    } = useUploaderContext()

    const adapterEntry = activeSource
        ? uploadAdapterObject[activeSource as keyof typeof uploadAdapterObject]
        : null
    const UploadComponent = adapterEntry?.Component
    const Icon = adapterEntry?.Icon

    if (!UploadComponent || mini || !activeSource || !Icon) return null

    return (
        <motion.div
            initial={{ y: '-100%' }}
            animate={{ y: '0%' }}
            exit={{ y: '-100%' }}
            className={cn(
                'upup-grid upup-h-full upup-w-full upup-grid-rows-[auto,1fr]',
                className,
            )}
            key="source-view"
            data-upup-slot="sourceView.root"
        >
            <div
                className="upup-shadow-bottom upup-flex upup-items-center upup-justify-between upup-px-3 upup-py-2 upup-text-sm upup-font-medium"
                style={{
                    backgroundColor: 'var(--upup-color-surface-alt)',
                    color: 'var(--upup-color-primary)',
                }}
                data-upup-slot="sourceView.header"
            >
                <Icon />
                <button
                    className="upup-rounded-md upup-p-1 upup-transition-all upup-duration-300"
                    style={{ color: 'var(--upup-color-primary)' }}
                    onClick={() => setActiveSource(null)}
                    type="button"
                    data-upup-slot="sourceView.cancelButton"
                >
                    Cancel
                </button>
            </div>
            <UploadComponent />
        </motion.div>
    )
}
