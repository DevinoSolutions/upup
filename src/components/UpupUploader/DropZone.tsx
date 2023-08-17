import React from 'react'
import { motion } from 'framer-motion'
import { TbUpload } from 'react-icons/tb'

export default function DropZone({
    setFiles,
    setIsDragging,
}: {
    setFiles: React.Dispatch<React.SetStateAction<File[]>>
    setIsDragging: React.Dispatch<React.SetStateAction<boolean>>
}) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full w-full bg-gray-300 absolute z-40 bg-opacity-50 p-2 text-blue-600 dark:bg-[#1f1f1f] dark:bg-opacity-70 backdrop-blur-sm rounded-md"
        >
            <div className="border h-full w-full border-dashed border-current rounded-md flex items-center justify-center text-4xl flex-col gap-2">
                <i className="border-2 border-current p-3 rounded-full">
                    <TbUpload />
                </i>
                <p className="text-xl">Drop your files here</p>
            </div>
            <input
                type="file"
                className="w-full h-full absolute top-0 opacity-0"
                multiple
                onChange={e => {
                    setFiles(prev => [...prev, ...Array.from(e.target.files!)])
                    setIsDragging(false)
                }}
            />
        </motion.div>
    )
}
