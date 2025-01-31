import { AnimatePresence, motion } from 'framer-motion'
import React from 'react'
import { useRootContext } from '../context/RootContext'
import { uploadAdapterObject } from '../lib/constants'
import { cn } from '../lib/tailwind'

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
        <AnimatePresence>
            <motion.div
                initial={{ y: '-100%' }}
                animate={{ y: '0%' }}
                exit={{ y: '-100%' }}
                className="grid h-full w-full grid-rows-[auto,1fr]"
            >
                <div
                    className={cn(
                        'shadow-bottom flex items-center justify-between bg-black/[0.025] px-3 py-2 text-sm font-medium text-[#1b5dab]',
                        {
                            'bg-white/5 text-[#FAFAFA] dark:bg-white/5 dark:text-[#FAFAFA]':
                                dark,
                        },
                        classNames.adapterViewHeader,
                    )}
                >
                    <Icon />
                    <button
                        className={cn(
                            'rounded-md p-1 text-blue-600 transition-all duration-300',
                            {
                                'text-[#30C5F7] dark:text-[#30C5F7]': dark,
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
        </AnimatePresence>
    )
}
