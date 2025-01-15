import { motion } from 'framer-motion'
import React, { ChangeEventHandler, Dispatch, SetStateAction } from 'react'
import { UploadAdapter } from '../../shared/types'
import { useRootContext } from '../context/RootContext'
import { uploadAdapterObject } from '../lib/constants'
import ShouldRender from './shared/ShouldRender'

type Props = {
    isDragging: boolean
    setIsDragging: Dispatch<SetStateAction<boolean>>
}

export default function AdapterSelector({ isDragging, setIsDragging }: Props) {
    const {
        inputRef,
        setView,
        setFiles,
        props: {
            accept,
            multiple,
            onIntegrationClick,
            uploadAdapters,
            mini,
            maxFileSize,
            onFileDragLeave,
            onFileDragOver,
            onFileDrop,
        },
    } = useRootContext()
    const chosenAdapters = Object.values(uploadAdapterObject).filter(item =>
        uploadAdapters.includes(item.id),
    )
    const handleAdapterClick = (adapterId: UploadAdapter) => {
        onIntegrationClick(adapterId)
        if (adapterId === UploadAdapter.INTERNAL) inputRef.current?.click()
        else setView(adapterId)
    }

    const handleInputFileChange: ChangeEventHandler<HTMLInputElement> = e => {
        setFiles(Array.from(e.currentTarget.files || []))
        e.currentTarget.value = ''
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`flex flex-col items-center justify-center gap-10 rounded-lg border border-[#1849D6] p-[30px] dark:border-[#30C5F7] lg:gap-14 ${
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
            <ShouldRender if={!mini}>
                <div className="flex flex-wrap items-center justify-center gap-[26px] lg:gap-[30px]">
                    {chosenAdapters.map(({ Icon, id, name }) => (
                        <button
                            type="button"
                            key={id}
                            className="group flex flex-col items-center justify-center gap-[3px] rounded-lg lg:gap-[6px]"
                            onKeyDown={e => {
                                if (e.key === 'Enter') e.preventDefault()
                            }}
                            onClick={() => handleAdapterClick(id)}
                        >
                            <span className="rounded-lg bg-white p-[6px] text-2xl font-semibold shadow group-hover:scale-110 dark:bg-[#323232]">
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
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1">
                    <span className="text-xs text-[#0B0B0B] dark:text-white lg:text-sm">
                        Drag your file(s) or
                    </span>
                    <span
                        className="cursor-pointer text-xs font-semibold text-[#0E2ADD] dark:text-[#59D1F9] lg:text-sm"
                        onClick={() => inputRef.current?.click()}
                    >
                        browse
                    </span>
                </div>
                <p className="text-xs text-[#6D6D6D] lg:text-sm">
                    Max {maxFileSize.size} {maxFileSize.unit} files are allowed
                </p>
            </div>
        </motion.div>
    )
}
