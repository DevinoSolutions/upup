import { AnimatePresence, motion } from 'framer-motion'
import React from 'react'
import { useRootContext } from '../context/RootContext'
import { uploadAdapterObject } from '../lib/constants'
import { cn } from '../lib/tailwind'

export default function AdapterView() {
    const {
        activeAdapter,
        setActiveAdapter,
        props: { mini, dark },
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
                <div
                    className={cn(
                        'flex items-center justify-between border-b border-[#e0e0e0] bg-[#fafafa] px-3 py-2 text-sm font-medium text-[#1b5dab]',
                        {
                            'border-[#6D6D6D] bg-[#1f1f1f] text-[#fafafa] dark:border-[#6D6D6D] dark:bg-[#1f1f1f] dark:text-[#fafafa]':
                                dark,
                        },
                    )}
                >
                    <Icon />
                    <button
                        className={cn(
                            'rounded-md p-1 text-blue-600 transition-all duration-300',
                            {
                                'text-[#30C5F7] dark:text-[#30C5F7]': dark,
                            },
                        )}
                        onClick={() => setActiveAdapter(undefined)}
                        type="button"
                    >
                        Cancel
                    </button>
                </div>

                <div
                    className={cn(
                        'flex items-center justify-center overflow-hidden bg-[#f5f5f5]',
                        {
                            'bg-[#1f1f1f] text-[#fafafa] dark:bg-[#1f1f1f] dark:text-[#fafafa]':
                                dark,
                        },
                    )}
                >
                    <UploadComponent />
                </div>
            </motion.div>
        </AnimatePresence>
    )
}
