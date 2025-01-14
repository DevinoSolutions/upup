import { AnimatePresence, motion } from 'framer-motion'
import React, { ChangeEventHandler } from 'react'
import { UploadAdapter } from '../../shared/types'
import { useRootContext } from '../context/RootContext'
import { uploadAdapterObject } from '../lib/constants'

export default function UploadAdapterView() {
    const {
        inputRef,
        setFiles,
        view,
        setView,
        props: { accept, multiple, mini },
    } = useRootContext()
    const UploadComponent = uploadAdapterObject[view].Component

    const handleInputFileChange: ChangeEventHandler<HTMLInputElement> = e => {
        setFiles(Array.from(e.currentTarget.files || []))
        e.currentTarget.value = ''
    }

    if (!UploadComponent || mini)
        return (
            <input
                type="file"
                accept={accept}
                className="absolute h-0 w-0"
                ref={inputRef}
                multiple={mini ? false : multiple}
                onChange={handleInputFileChange}
            />
        )

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: '-100%' }}
                animate={{ y: '0%' }}
                exit={{ y: '-100%' }}
                className="absolute z-20 grid h-full w-full grid-rows-[auto,1fr] "
            >
                <div className="group flex h-12 items-center justify-between border-b bg-[#fafafa] p-2 text-sm font-medium text-[#1b5dab] dark:bg-[#1f1f1f] dark:text-[#fafafa]">
                    <button
                        className="rounded-md p-2 px-4 transition-all duration-300 hover:bg-[#e9ecef] active:bg-[#dfe6f1] dark:group-hover:text-[#1f1f1f]"
                        onClick={() => setView(UploadAdapter.INTERNAL)}
                        type="button"
                    >
                        Cancel
                    </button>
                    <p className="text-[#333] dark:text-[#fafafa]">
                        Import from {uploadAdapterObject[view].name}
                    </p>
                    <button
                        className="rounded-md p-2 px-4 opacity-0 transition-all duration-300 hover:bg-[#e9ecef] active:bg-[#dfe6f1]"
                        type="button"
                    >
                        Cancel
                    </button>
                </div>

                <div className="flex items-center justify-center bg-[#f5f5f5] dark:bg-[#1f1f1f] dark:text-[#fafafa]">
                    <UploadComponent />
                </div>
            </motion.div>
        </AnimatePresence>
    )
}
