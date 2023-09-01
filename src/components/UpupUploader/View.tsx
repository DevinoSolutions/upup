import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import FileBrowser from './FileBrowser'

const View = ({
    view,
    setView,
    methods,
    components,
    setFiles,
}: {
    view: string
    setView: (view: string) => void
    methods: any[]
    components: any
    setFiles: React.Dispatch<React.SetStateAction<File[]>>
}) => {
    return (
        <AnimatePresence>
            {view !== 'internal' && (
                <motion.div
                    initial={{ y: '-100%' }}
                    animate={{ y: '0%' }}
                    exit={{ y: '-100%' }}
                    className="absolute h-full w-full grid grid-rows-[auto,1fr] z-20 "
                >
                    <div className="h-12 bg-[#fafafa] border-b flex justify-between items-center p-2 text-sm text-[#1b5dab] font-medium dark:bg-[#1f1f1f] dark:text-[#fafafa] group">
                        <button
                            className="hover:bg-[#e9ecef] active:bg-[#dfe6f1] rounded-md p-2 px-4 transition-all duration-300 dark:group-hover:text-[#1f1f1f]"
                            onClick={() => setView('internal')}
                        >
                            Cancel
                        </button>
                        <p className="text-[#333] dark:text-[#fafafa]">
                            Import from {methods.find(x => x.id === view)!.name}
                        </p>
                        <button className="hover:bg-[#e9ecef] active:bg-[#dfe6f1] rounded-md p-2 px-4 transition-all duration-300 opacity-0">
                            Cancel
                        </button>
                    </div>

                    <div className="bg-[#f5f5f5] flex justify-center items-center dark:bg-[#1f1f1f] dark:text-[#fafafa]">
                        {/* {components[view]} */}
                        <FileBrowser setFiles={setFiles} setView={setView} />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

export default View
