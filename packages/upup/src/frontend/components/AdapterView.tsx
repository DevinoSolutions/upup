import { motion } from 'framer-motion'
import React from 'react'
import { useRootContext } from '../context/RootContext'
import { uploadAdapterObject } from '../lib/constants'
import { cn } from '../lib/tailwind'
import MyAnimatePresence from './shared/MyAnimatePresence'

export default function AdapterView() {
    const {
        activeAdapter,
        setActiveAdapter,
        props: { mini, dark, classNames },
    } = useRootContext()
    const UploadComponent =
        activeAdapter && uploadAdapterObject[activeAdapter].Component
    const Icon = activeAdapter && uploadAdapterObject[activeAdapter].Icon

    if (!UploadComponent || mini || !activeAdapter || !Icon) return null

    return (
        <MyAnimatePresence>
            <motion.div
                initial={{ y: '-100%' }}
                animate={{ y: '0%' }}
                exit={{ y: '-100%' }}
                className="upup-grid upup-h-full upup-w-full upup-grid-rows-[auto,1fr]"
                key="adapter-view"
            >
                <div
                    className={cn(
                        'upup-shadow-bottom upup-flex upup-items-center upup-justify-between upup-bg-black/[0.025] upup-px-3 upup-py-2 upup-text-sm upup-font-medium upup-text-[#1b5dab]',
                        {
                            'upup-bg-white/5 upup-text-[#FAFAFA] dark:upup-bg-white/5 dark:upup-text-[#FAFAFA]':
                                dark,
                        },
                        classNames.adapterViewHeader,
                    )}
                >
                    <Icon />
                    <button
                        className={cn(
                            'upup-rounded-md upup-p-1 upup-text-blue-600 upup-transition-all upup-duration-300',
                            {
                                'upup-text-[#30C5F7] dark:upup-text-[#30C5F7]':
                                    dark,
                            },
                            classNames.adapterViewCancelButton,
                        )}
                        onClick={() => setActiveAdapter(undefined)}
                        type="button"
                    >
                        Cancel
                    </button>
                </div>
                <UploadComponent />
            </motion.div>
        </MyAnimatePresence>
    )
}
