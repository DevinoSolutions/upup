import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const View = ({
    view,
    setView,
    methods,
}: {
    view: string
    setView: (view: string) => void
    methods: any[]
}) => {
    return (
        <AnimatePresence>
            {view !== 'internal' && (
                <motion.div
                    initial={{ y: '-100%' }}
                    animate={{ y: '0%' }}
                    exit={{ y: '-100%' }}
                    className="absolute h-full w-full grid grid-rows-[auto,1fr] z-20"
                >
                    <div className="h-12 bg-[#fafafa] border-b flex justify-between items-center p-2 text-sm text-[#1b5dab] font-medium">
                        <button
                            className="hover:bg-[#e9ecef] active:bg-[#dfe6f1] rounded-md p-2 px-4 transition-all duration-300"
                            onClick={() => setView('internal')}
                        >
                            Cancel
                        </button>
                        <p className="text-[#333]">
                            Import from {methods.find(x => x.id === view)!.name}
                        </p>
                        <button className="hover:bg-[#e9ecef] active:bg-[#dfe6f1] rounded-md p-2 px-4 transition-all duration-300 opacity-0">
                            Cancel
                        </button>
                    </div>

                    <div className="bg-[#f5f5f5] flex justify-center items-center">
                        Soon..
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

export default View
