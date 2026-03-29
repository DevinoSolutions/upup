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
        dark,
        classNames,
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
        >
            <div
                className={cn(
                    'upup-shadow-bottom upup-flex upup-items-center upup-justify-between upup-bg-black/[0.025] upup-px-3 upup-py-2 upup-text-sm upup-font-medium upup-text-[#1b5dab]',
                    {
                        'upup-bg-white/5 upup-text-[#FAFAFA] dark:upup-bg-white/5 dark:upup-text-[#FAFAFA]':
                            dark,
                    },
                    (classNames as any)?.adapterViewHeader,
                )}
            >
                <Icon />
                <button
                    className={cn(
                        'upup-rounded-md upup-p-1 upup-text-blue-600 upup-transition-all upup-duration-300',
                        {
                            'upup-text-[#30C5F7] dark:upup-text-[#30C5F7]': dark,
                        },
                        (classNames as any)?.adapterViewCancelButton,
                    )}
                    onClick={() => setActiveSource(null)}
                    type="button"
                >
                    Cancel
                </button>
            </div>
            <UploadComponent />
        </motion.div>
    )
}
