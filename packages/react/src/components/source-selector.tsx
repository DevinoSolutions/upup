'use client'

import React, { useCallback, useRef } from 'react'
import { TbUpload } from 'react-icons/tb'
import { useUploaderContext } from '../context/uploader-context'
import useAdapterSelector from '../hooks/use-adapter-selector'
import { cn } from '../lib/tailwind'

export type SourceSelectorProps = {
    className?: string
}

export default function SourceSelector({ className }: SourceSelectorProps) {
    const {
        mini,
        dark,
        classNames,
        addFiles,
    } = useUploaderContext()

    const { chosenAdapters, handleAdapterClick, handleInputFileChange, localInputRef } =
        useAdapterSelector()

    const handleBrowseFilesClick = useCallback(() => {
        if (localInputRef?.current) {
            localInputRef.current.removeAttribute('webkitdirectory')
            localInputRef.current.removeAttribute('directory')
            localInputRef.current.click()
        }
    }, [localInputRef])

    const handleSelectFolderClick = useCallback(async () => {
        const anyWindow = window as any
        if (anyWindow.showDirectoryPicker) {
            try {
                const directoryHandle = await anyWindow.showDirectoryPicker()
                const files: File[] = []

                async function getFiles(dirHandle: any, path = '') {
                    for await (const entry of dirHandle.values()) {
                        const newPath = path
                            ? `${path}/${entry.name}`
                            : entry.name
                        if (entry.kind === 'file') {
                            const file = await entry.getFile()
                            ;(file as any).webkitRelativePath = newPath
                            files.push(file)
                        } else if (entry.kind === 'directory') {
                            await getFiles(entry, newPath)
                        }
                    }
                }
                await getFiles(directoryHandle)
                if (files.length > 0) {
                    await addFiles(files)
                    if (localInputRef?.current) {
                        localInputRef.current.value = ''
                    }
                }
            } catch {
                // User cancelled, do nothing.
            }
        } else {
            if (localInputRef?.current) {
                localInputRef.current.setAttribute('webkitdirectory', 'true')
                localInputRef.current.setAttribute('directory', 'true')
                localInputRef.current.click()
            }
        }
    }, [localInputRef, addFiles])

    return (
        <div
            className={cn(
                'upup-relative upup-flex upup-h-full upup-gap-3 upup-rounded-lg',
                {
                    'upup-flex-col-reverse upup-items-center upup-justify-center md:upup-flex-col md:upup-gap-14': true,
                },
                className,
            )}
        >
            {!mini && (
                <div
                    className={cn(
                        'upup-flex upup-w-full upup-flex-col upup-justify-center upup-gap-1 md:upup-flex-row md:upup-flex-wrap md:upup-items-center md:upup-gap-[30px] md:upup-px-[30px]',
                        (classNames as any)?.adapterButtonList,
                    )}
                >
                    {chosenAdapters.map(({ Icon, id }) => (
                        <button
                            key={id}
                            type="button"
                            className={cn(
                                'upup-group upup-flex upup-items-center upup-gap-[6px] upup-border-b upup-border-gray-200 upup-px-2 upup-py-1 md:upup-flex-col md:upup-justify-center md:upup-rounded-lg md:upup-border-none md:upup-p-0',
                                {
                                    'upup-border-[#6D6D6D] dark:upup-border-[#6D6D6D]':
                                        dark,
                                },
                                (classNames as any)?.adapterButton,
                            )}
                            onClick={() => handleAdapterClick(id)}
                        >
                            {Icon && <Icon />}
                            <span
                                className={cn(
                                    'upup-text-xs upup-text-[#242634]',
                                    {
                                        'upup-text-gray-300 dark:upup-text-gray-300':
                                            dark,
                                    },
                                    (classNames as any)?.adapterButtonText,
                                )}
                            >
                                {id}
                            </span>
                        </button>
                    ))}
                </div>
            )}
            <input
                type="file"
                className="upup-hidden"
                data-testid="upup-file-input"
                ref={localInputRef}
                aria-label="Choose files to upload"
                onChange={handleInputFileChange}
            />
            {mini ? (
                <button
                    type="button"
                    onClick={handleBrowseFilesClick}
                    className="upup-flex upup-cursor-pointer upup-flex-col upup-items-center upup-justify-center upup-gap-2 upup-rounded-lg upup-p-2"
                >
                    <TbUpload
                        size={32}
                        className={cn(
                            'upup-h-16 upup-w-16 md:upup-h-20 md:upup-w-20',
                            {
                                'upup-text-[#0B0B0B]': !dark,
                                'upup-text-white dark:upup-text-white': dark,
                            },
                        )}
                    />
                    <p
                        className={cn('px-6 upup-text-center upup-text-xs', {
                            'upup-text-[#6D6D6D] dark:upup-text-gray-400': !dark,
                            'upup-text-gray-400 dark:upup-text-gray-500': dark,
                        })}
                    >
                        Drag or browse to upload
                    </p>
                </button>
            ) : (
                <div className="upup-flex upup-flex-col upup-items-center upup-gap-1 upup-px-3 upup-text-center md:upup-gap-2 md:upup-px-[30px]">
                    <div className="upup-flex upup-flex-wrap upup-items-center upup-justify-center upup-gap-1">
                        <span
                            className={cn(
                                'upup-text-xs upup-text-[#0B0B0B] md:upup-text-sm',
                                { 'upup-text-white dark:upup-text-white': dark },
                            )}
                        >
                            Drag files here or
                        </span>
                        <button
                            type="button"
                            className={cn(
                                'upup-cursor-pointer upup-text-xs upup-font-semibold upup-text-[#0E2ADD] md:upup-text-sm',
                                {
                                    'upup-text-[#59D1F9] dark:upup-text-[#59D1F9]':
                                        dark,
                                },
                            )}
                            onClick={handleBrowseFilesClick}
                        >
                            browse files
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
