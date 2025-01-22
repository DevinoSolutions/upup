import { AnimatePresence, motion } from 'framer-motion'
import React from 'react'
import { useRootContext } from '../context/RootContext'
import { uploadAdapterObject } from '../lib/constants'

export default function AdapterView() {
    const {
        activeAdapter,
        setActiveAdapter,
        props: { mini },
    } = useRootContext()
    const UploadComponent =
        activeAdapter && uploadAdapterObject[activeAdapter].Component
    const Icon = activeAdapter && uploadAdapterObject[activeAdapter].Icon

    if (!UploadComponent || mini || !activeAdapter || !Icon) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: '-100%' }}
                animate={{ y: '0%' }}
                exit={{ y: '-100%' }}
                className="grid h-full w-full grid-rows-[auto,1fr]"
            >
                <div className="flex items-center justify-between border-b border-[#e0e0e0] bg-[#fafafa] px-3 py-2 text-sm font-medium text-[#1b5dab] dark:bg-[#1f1f1f] dark:text-[#fafafa]">
                    <Icon />
                    <button
                        className="rounded-md p-1 transition-all duration-300"
                        onClick={() => setActiveAdapter(undefined)}
                        type="button"
                    >
                        Cancel
                    </button>
                </div>

                <div className="flex items-center justify-center overflow-hidden bg-[#f5f5f5] dark:bg-[#1f1f1f] dark:text-[#fafafa]">
                    <UploadComponent />
                </div>
            </motion.div>
        </AnimatePresence>
    )
}
