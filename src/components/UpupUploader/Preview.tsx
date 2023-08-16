import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { TbEdit, TbX } from 'react-icons/tb'
import { bytesToSize } from '../../lib/bytesToSize'

const Preview = ({
    files,
    setFiles,
}: {
    files: File[]
    setFiles: (files: File[]) => void
}) => {
    const removeFile = (index: number) => {
        const newFiles = files.filter((_, i) => i !== index)
        setFiles(newFiles)
    }

    return (
        <AnimatePresence>
            {files.length > 0 && (
                <motion.div className="h-full w-full grid grid-rows-[auto,1fr,auto] text-sm font-medium absolute z-10">
                    <motion.div
                        initial={{ scaleY: '0%' }}
                        animate={{ scaleY: '100%' }}
                        exit={{ scaleY: '0%' }}
                        className="flex justify-between items-center p-2 border-b bg-[#fafafa] text-[#1b5dab] origin-top"
                    >
                        <button
                            className="hover:bg-[#e9ecef] active:bg-[#dfe6f1] rounded-md p-2 px-4 transition-all duration-300"
                            onClick={() => setFiles([])}
                        >
                            Cancel
                        </button>
                        <p className="text-[#333]">
                            {files.length} file{files.length > 1 ? 's' : ''}{' '}
                            selected
                        </p>
                        <button className="hover:bg-[#e9ecef] active:bg-[#dfe6f1] rounded-md p-2 px-4 transition-all duration-300">
                            Add more
                        </button>
                    </motion.div>

                    <motion.div
                        initial={{ scaleY: '0%' }}
                        animate={{ scaleY: '100%' }}
                        exit={{ scaleY: '0%' }}
                        className="grid grid-cols-4 p-4 border-b bg-[#f4f4f4] origin-bottom gap-4 overflow-y-scroll"
                    >
                        {files.map((file, i) => (
                            <div
                                key={i}
                                className="flex flex-col items-start h-full w-full relative"
                            >
                                <img
                                    src={URL.createObjectURL(file)}
                                    alt=""
                                    className="h-40 w-full rounded-md object-cover shadow"
                                />
                                <div className="flex items-center justify-between w-full">
                                    <div>
                                        <p className="font-medium text-xs mt-1">
                                            {file.name}
                                        </p>
                                        <p className="font-medium text-[10px] text-gray-500">
                                            {bytesToSize(file.size)}
                                        </p>
                                    </div>
                                    <button>
                                        <TbEdit />
                                    </button>
                                </div>
                                <button
                                    className="bg-black rounded-full absolute -top-1 -right-1"
                                    onClick={() => removeFile(i)}
                                >
                                    <TbX className="h-4 w-4 text-white" />
                                </button>
                            </div>
                        ))}
                    </motion.div>

                    <motion.div
                        initial={{ scaleY: '0%' }}
                        animate={{ scaleY: '100%' }}
                        exit={{ scaleY: '0%' }}
                        className="flex justify-start items-center p-3 border-b bg-[#fafafa] text-white origin-bottom"
                    >
                        <button
                            className="bg-green-500 hover:bg-green-600 active:bg-green-700 rounded-md p-3 px-6 transition-all duration-300"
                            onClick={() => setFiles([])}
                        >
                            Upload {files.length} file
                            {files.length > 1 ? 's' : ''}
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

export default Preview
