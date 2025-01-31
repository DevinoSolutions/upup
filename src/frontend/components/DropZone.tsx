import { AnimatePresence, motion } from 'framer-motion'
import React, { Dispatch, SetStateAction } from 'react'
import { TbUpload } from 'react-icons/tb'
import { useRootContext } from '../context/RootContext'
import ShouldRender from './shared/ShouldRender'

type Props = {
    isDragging: boolean
    setIsDragging: Dispatch<SetStateAction<boolean>>
}

export default function DropZone({ isDragging, setIsDragging }: Props) {
    const {
        setFiles,
        props: { multiple, onFileDragLeave, onFileDragOver, onFileDrop },
    } = useRootContext()

    return (
        <ShouldRender if={isDragging}>
            <AnimatePresence>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute z-40 h-full w-full rounded-md bg-gray-300 bg-opacity-50 p-2 text-blue-600 backdrop-blur-sm dark:bg-[#1f1f1f] dark:bg-opacity-70"
                    onDragOver={e => {
                        e.preventDefault()
                        setIsDragging(true)
                        e.dataTransfer.dropEffect = 'copy'

                        const files = Array.from(e.dataTransfer.files)
                        onFileDragOver?.(files)
                    }}
                    onDragLeave={e => {
                        e.preventDefault()
                        setIsDragging(false)

                        const files = Array.from(e.dataTransfer.files)
                        onFileDragLeave?.(files)
                    }}
                    onDrop={e => {
                        e.preventDefault()

                        const droppedFiles = Array.from(e.dataTransfer.files)

                        onFileDrop?.(droppedFiles)
                        setFiles(droppedFiles)

                        setIsDragging(false)
                    }}
                >
                    <div
                        className={`flex h-full w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-current
                    ${!multiple ? 'text-center text-xl' : 'text-4xl'}`}
                    >
                        <i className="rounded-full border-2 border-current p-3">
                            <TbUpload />
                        </i>
                        <p className={`${!multiple ? 'text-xl' : 'text-lg'}`}>
                            Drop your files here
                        </p>
                    </div>
                </motion.div>
            </AnimatePresence>
        </ShouldRender>
    )
}
