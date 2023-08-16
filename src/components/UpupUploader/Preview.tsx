import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const Preview = ({
    files,
    setFiles,
}: {
    files: File[]
    setFiles: (files: File[]) => void
}) => (
    <AnimatePresence>
        {files.length > 0 ? (
            <motion.div
                key={'files-preview'}
                initial={{ scaleY: '0%', height: '3rem' }}
                animate={{ scaleY: '100%' }}
                exit={{ scaleY: '0%', height: '0rem' }}
                className="h-12 bg-[#fafafa] border-b flex justify-between items-center p-2 text-sm text-[#1b5dab] font-medium origin-top"
            >
                <button
                    className="hover:bg-[#e9ecef] active:bg-[#dfe6f1] rounded-md p-2 px-4 transition-all duration-300"
                    onClick={() => setFiles([])}
                >
                    Cancel
                </button>
                <p className="text-[#333]">
                    {files.length} file{files.length > 1 ? 's' : ''} selected
                </p>
                <button className="hover:bg-[#e9ecef] active:bg-[#dfe6f1] rounded-md p-2 px-4 transition-all duration-300">
                    Add more
                </button>
            </motion.div>
        ) : (
            <div></div>
        )}
    </AnimatePresence>
)

export default Preview
