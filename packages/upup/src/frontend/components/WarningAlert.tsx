import { motion } from 'framer-motion'
import React from 'react'
import { TbAlertCircle, TbX } from 'react-icons/tb'
import { cn } from '../lib/tailwind'

interface WarningAlertProps {
    message: string
    onClose: () => void
    dark?: boolean
}

export default function WarningAlert({
    message,
    onClose,
    dark = false,
}: WarningAlertProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
                'upup-absolute upup-left-4 upup-right-4 upup-top-4 upup-z-50',
                'upup-flex upup-items-center upup-gap-2',
                'upup-rounded-lg upup-px-4 upup-py-3 upup-shadow-lg',
                'upup-mx-auto upup-max-w-lg',
                {
                    'upup-border upup-border-amber-200 upup-bg-amber-50 upup-text-amber-900':
                        !dark,
                    'upup-border upup-border-amber-700 upup-bg-amber-900/90 upup-text-amber-100':
                        dark,
                },
            )}
        >
            <TbAlertCircle
                className={cn('upup-h-5 upup-w-5 upup-flex-shrink-0', {
                    'upup-text-amber-600': !dark,
                    'upup-text-amber-300': dark,
                })}
            />
            <p className="upup-flex-1 upup-break-words upup-text-sm upup-font-medium">
                {message}
            </p>
            <button
                onClick={onClose}
                className={cn(
                    'upup-flex-shrink-0 upup-rounded upup-p-1 upup-transition-colors',
                    {
                        'upup-text-amber-600 hover:upup-bg-amber-100': !dark,
                        'upup-text-amber-300 hover:upup-bg-amber-800': dark,
                    },
                )}
                aria-label="Close warning"
            >
                <TbX className="upup-h-4 upup-w-4" />
            </button>
        </motion.div>
    )
}
