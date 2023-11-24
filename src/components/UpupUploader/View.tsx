import { FC } from 'react'
import type { Method } from 'types'

import { AnimatePresence, motion } from 'framer-motion'

type Props = {
    view: string
    setView: (view: string) => void
    methods: Method[]
    components: any
}

const View: FC<Props> = ({ view, setView, methods, components }: Props) => {
    return (
        <AnimatePresence>
            {view !== 'internal' && (
                <motion.div
                    initial={{ y: '-100%' }}
                    animate={{ y: '0%' }}
                    exit={{ y: '-100%' }}
                    className="absolute z-20 grid h-full w-full grid-rows-[auto,1fr] "
                >
                    <div className="group flex h-12 items-center justify-between border-b bg-[#fafafa] p-2 text-sm font-medium text-[#1b5dab] dark:bg-[#1f1f1f] dark:text-[#fafafa]">
                        <button
                            className="rounded-md p-2 px-4 transition-all duration-300 hover:bg-[#e9ecef] active:bg-[#dfe6f1] dark:group-hover:text-[#1f1f1f]"
                            onClick={() => setView('internal')}
                            type="button"
                        >
                            Cancel
                        </button>
                        <p className="text-[#333] dark:text-[#fafafa]">
                            Import from {methods.find(x => x.id === view)!.name}
                        </p>
                        <button
                            className="rounded-md p-2 px-4 opacity-0 transition-all duration-300 hover:bg-[#e9ecef] active:bg-[#dfe6f1]"
                            type="button"
                        >
                            Cancel
                        </button>
                    </div>

                    <div className="flex items-center justify-center bg-[#f5f5f5] dark:bg-[#1f1f1f] dark:text-[#fafafa]">
                        {components[view]}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

export default View
