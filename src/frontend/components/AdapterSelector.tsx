import { motion } from 'framer-motion'
import React, { Dispatch, SetStateAction } from 'react'
import useAdapterSelector from '../hooks/useAdapterSelector'
import { cn } from '../lib/tailwind'
import MainBoxHeader from './shared/MainBoxHeader'
import MyAnimatePresence from './shared/MyAnimatePresence'
import ShouldRender from './shared/ShouldRender'

type Props = {
    isDragging: boolean
    setIsDragging: Dispatch<SetStateAction<boolean>>
}

export default function AdapterSelector({
    isDragging,
    setIsDragging,
}: Readonly<Props>) {
    const {
        props: {
            onFilesDragOver,
            onFilesDragLeave,
            onFilesDrop,
            mini,
            accept,
            multiple,
            limit,
            maxFileSize,
            dark,
            classNames,
        },
        setFiles,
        isAddingMore,
        setIsAddingMore,
        chosenAdapters,
        handleAdapterClick,
        inputRef,
        handleInputFileChange,
    } = useAdapterSelector()

    return (
        <MyAnimatePresence>
            <motion.div
                key="adapter-selector"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={cn(
                    'relative flex h-full flex-col-reverse items-center justify-center gap-3 rounded-lg border border-[#1849D6] @cs/main:flex-col @cs/main:gap-14',
                    {
                        'pt-[72px] @cs/main:pt-0': isAddingMore,
                        'border-[#30C5F7] dark:border-[#30C5F7]': dark,
                        'border-dashed': !isDragging,
                        'bg-[#E7ECFC] backdrop-blur-sm': isDragging && !dark,
                        'bg-[#045671] backdrop-blur-sm dark:bg-[#045671]':
                            isDragging && dark,
                    },
                )}
                onDragOver={e => {
                    e.preventDefault()
                    setIsDragging(true)
                    e.dataTransfer.dropEffect = 'copy'

                    const files = Array.from(e.dataTransfer.files)
                    onFilesDragOver(files)
                }}
                onDragLeave={e => {
                    e.preventDefault()
                    setIsDragging(false)

                    const files = Array.from(e.dataTransfer.files)
                    onFilesDragLeave(files)
                }}
                onDrop={e => {
                    e.preventDefault()

                    const droppedFiles = Array.from(e.dataTransfer.files)

                    onFilesDrop(droppedFiles)
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
                    <div
                        className={cn(
                            'flex w-full flex-col justify-center gap-1 @cs/main:flex-row @cs/main:flex-wrap @cs/main:items-center @cs/main:gap-[30px] @cs/main:px-[30px]',
                            classNames.adapterButtonList,
                        )}
                    >
                        {chosenAdapters.map(({ Icon, id, name }) => (
                            <button
                                type="button"
                                key={id}
                                className={cn(
                                    'group flex items-center gap-[6px] border-b border-gray-200 px-2 py-1 @cs/main:flex-col @cs/main:justify-center @cs/main:rounded-lg @cs/main:border-none @cs/main:p-0',
                                    {
                                        'border-[#6D6D6D] dark:border-[#6D6D6D]':
                                            dark,
                                    },
                                    classNames.adapterButton,
                                )}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') e.preventDefault()
                                }}
                                onClick={() => handleAdapterClick(id)}
                            >
                                <span
                                    className={cn(
                                        'scale-75 rounded-lg bg-white p-0 text-2xl font-semibold group-hover:scale-90 @cs/main:scale-100 @cs/main:p-[6px] @cs/main:shadow @cs/main:group-hover:scale-110',
                                        {
                                            'bg-[#323232] dark:bg-[#323232]':
                                                dark,
                                        },
                                        classNames.adapterButtonIcon,
                                    )}
                                >
                                    <Icon />
                                </span>
                                <span
                                    className={cn(
                                        'text-xs text-[#242634]',
                                        {
                                            'text-[#6D6D6D] dark:text-[#6D6D6D]':
                                                dark,
                                        },
                                        classNames.adapterButtonText,
                                    )}
                                >
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
                    multiple={multiple}
                    onChange={handleInputFileChange}
                />
                <div className="flex flex-col items-center gap-1 text-center @cs/main:gap-2 @cs/main:px-[30px]">
                    <div className="flex items-center gap-1">
                        <span
                            className={cn(
                                'text-xs text-[#0B0B0B] @cs/main:text-sm',
                                {
                                    'text-white dark:text-white': dark,
                                },
                            )}
                        >
                            Drag your file
                            {limit > 1 ? 's' : ''} or
                        </span>
                        <span
                            className={cn(
                                'cursor-pointer text-xs font-semibold text-[#0E2ADD] @cs/main:text-sm',
                                { 'text-[#59D1F9] dark:text-[#59D1F9]': dark },
                            )}
                            onClick={() => inputRef.current?.click()}
                        >
                            browse
                        </span>
                    </div>
                    <p className="text-xs text-[#6D6D6D] @cs/main:text-sm">
                        Max {maxFileSize.size} {maxFileSize.unit} file
                        {limit > 1 ? 's are ' : ' is '} allowed
                    </p>
                </div>
            </motion.div>
        </MyAnimatePresence>
    )
}
