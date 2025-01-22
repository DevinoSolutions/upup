import { AnimatePresence, motion } from 'framer-motion'
import React, { Dispatch, SetStateAction } from 'react'
import useAdapterSelector from '../hooks/useAdapterSelector'
import MainBoxHeader from './shared/MainBoxHeader'
import ShouldRender from './shared/ShouldRender'

type Props = {
    isDragging: boolean
    setIsDragging: Dispatch<SetStateAction<boolean>>
}

export default function AdapterSelector({ isDragging, setIsDragging }: Props) {
    const {
        onFileDragOver,
        onFileDragLeave,
        onFileDrop,
        setFiles,
        isAddingMore,
        setIsAddingMore,
        mini,
        chosenAdapters,
        handleAdapterClick,
        accept,
        inputRef,
        multiple,
        handleInputFileChange,
        limit,
        maxFileSize,
    } = useAdapterSelector()

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`relative flex h-full flex-col-reverse items-center justify-center gap-3 rounded-lg border border-[#1849D6] dark:border-[#30C5F7] sm:flex-col sm:gap-10 md:gap-14 ${
                    isDragging
                        ? 'bg-[#E7ECFC] backdrop-blur-sm dark:bg-[#045671]'
                        : 'border-dashed'
                }`}
                onDragOver={e => {
                    e.preventDefault()
                    setIsDragging(true)
                    e.dataTransfer.dropEffect = 'copy'

                    const files = Array.from(e.dataTransfer.files)
                    onFileDragOver(files)
                }}
                onDragLeave={e => {
                    e.preventDefault()
                    setIsDragging(false)

                    const files = Array.from(e.dataTransfer.files)
                    onFileDragLeave(files)
                }}
                onDrop={e => {
                    e.preventDefault()

                    const droppedFiles = Array.from(e.dataTransfer.files)

                    onFileDrop(droppedFiles)
                    setFiles(droppedFiles)

                    setIsDragging(false)
                }}
            >
                <ShouldRender if={isAddingMore}>
                    <MainBoxHeader
                        handleCancel={() => setIsAddingMore(false)}
                    />
                </ShouldRender>
                <ShouldRender if={!mini}>
                    <div className="flex w-full flex-col justify-center gap-0 sm:flex-row sm:flex-wrap sm:items-center sm:gap-[26px] sm:px-[30px] md:gap-[30px]">
                        {chosenAdapters.map(({ Icon, id, name }) => (
                            <button
                                type="button"
                                key={id}
                                className="group flex items-center gap-[6px] max-sm:border-b max-sm:border-gray-200 max-sm:px-2 max-sm:py-1 sm:flex-col sm:justify-center sm:rounded-lg"
                                onKeyDown={e => {
                                    if (e.key === 'Enter') e.preventDefault()
                                }}
                                onClick={() => handleAdapterClick(id)}
                            >
                                <span className="rounded-lg bg-white p-1 text-2xl font-semibold shadow group-hover:scale-90 dark:bg-[#323232] max-sm:scale-75 sm:p-[6px] sm:group-hover:scale-110">
                                    <Icon />
                                </span>
                                <span className=" text-xs text-[#242634] dark:text-[#6D6D6D]">
                                    {name}
                                </span>
                            </button>
                        ))}
                    </div>
                </ShouldRender>
                <input
                    type="file"
                    accept={accept}
                    className="hidden"
                    ref={inputRef}
                    multiple={mini ? false : multiple}
                    onChange={handleInputFileChange}
                />
                <div className="flex flex-col items-center gap-1 text-center sm:gap-2 sm:px-[30px]">
                    <div className="flex items-center gap-1">
                        <span className="text-xs text-[#0B0B0B] dark:text-white sm:text-sm">
                            Drag your file
                            {limit > 1 ? 's' : ''} or
                        </span>
                        <span
                            className="cursor-pointer text-xs font-semibold text-[#0E2ADD] dark:text-[#59D1F9] sm:text-sm"
                            onClick={() => inputRef.current?.click()}
                        >
                            browse
                        </span>
                    </div>
                    <p className="text-xs text-[#6D6D6D] sm:text-sm">
                        Max {maxFileSize.size} {maxFileSize.unit} file
                        {limit > 1 ? 's are ' : ' is '} allowed
                    </p>
                </div>
            </motion.div>
        </AnimatePresence>
    )
}
