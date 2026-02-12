import React, { useCallback } from 'react'
import { useRootContext } from '../context/RootContext'
import useAdapterSelector from '../hooks/useAdapterSelector'
import { cn } from '../lib/tailwind'
import ShouldRender from './shared/ShouldRender'

export default function AdapterSelector() {
    const {
        props: {
            mini,
            accept,
            multiple,
            limit,
            maxFileSize,
            dark,
            classNames,
            showSelectFolderButton,
        },
        isAddingMore,
        setIsAddingMore,
        inputRef,
        setFiles,
    } = useRootContext()
    const { chosenAdapters, handleAdapterClick, handleInputFileChange } =
        useAdapterSelector()

    const handleBrowseFilesClick = useCallback(() => {
        if (inputRef.current) {
            inputRef.current.removeAttribute('webkitdirectory')
            inputRef.current.removeAttribute('directory')
            inputRef.current.click()
        }
    }, [inputRef])

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
                    setFiles(files)
                    if (inputRef.current) {
                        inputRef.current.value = ''
                    }
                }
            } catch {
                // User cancelled, do nothing.
            }
        } else {
            // Fallback to existing behavior
            if (inputRef.current) {
                inputRef.current.setAttribute('webkitdirectory', 'true')
                inputRef.current.setAttribute('directory', 'true')
                inputRef.current.click()
            }
        }
    }, [inputRef, setFiles])

    return (
        <div
            className={cn(
                'upup-relative upup-flex upup-h-full upup-items-center upup-justify-center upup-gap-3 upup-rounded-lg',
                {
                    'upup-flex-col': isAddingMore,
                    'upup-flex-col-reverse md:upup-flex-col md:upup-gap-14':
                        !isAddingMore,
                },
            )}
        >
            <ShouldRender if={isAddingMore}>
                <div
                    className={cn(
                        'upup-shadow-bottom upup-flex upup-w-full upup-items-center upup-rounded-t-lg upup-bg-black/[0.025] upup-px-3 upup-py-2',
                        {
                            'upup-bg-white/5 dark:upup-bg-white/5': dark,
                        },
                        classNames.containerHeader,
                    )}
                >
                    <button
                        className={cn(
                            'upup-flex upup-items-center upup-gap-1 upup-text-sm upup-font-medium upup-text-blue-600',
                            {
                                'upup-text-[#30C5F7] dark:upup-text-[#30C5F7]':
                                    dark,
                            },
                            classNames.containerCancelButton,
                        )}
                        onClick={() => setIsAddingMore(false)}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                        Back
                    </button>
                    <span
                        className={cn(
                            'upup-flex-1 upup-text-center upup-text-sm upup-text-[#6D6D6D]',
                            {
                                'upup-text-gray-300 dark:upup-text-gray-300':
                                    dark,
                            },
                        )}
                    >
                        Adding more files
                    </span>
                </div>
            </ShouldRender>
            <ShouldRender if={!mini}>
                <div
                    className={cn(
                        'upup-flex upup-w-full upup-flex-col upup-justify-center upup-gap-1 md:upup-flex-row md:upup-flex-wrap md:upup-items-center md:upup-gap-[30px] md:upup-px-[30px]',
                        classNames.adapterButtonList,
                    )}
                >
                    {chosenAdapters.map(({ Icon, id, name }) => (
                        <button
                            key={id}
                            type="button"
                            className={cn(
                                'upup-group upup-flex upup-items-center upup-gap-[6px] upup-border-b upup-border-gray-200 upup-px-2 upup-py-1 md:upup-flex-col md:upup-justify-center md:upup-rounded-lg md:upup-border-none md:upup-p-0',
                                {
                                    'upup-border-[#6D6D6D] dark:upup-border-[#6D6D6D]':
                                        dark,
                                },
                                classNames.adapterButton,
                            )}
                            onKeyDown={e => {
                                if (e.key === 'Enter') e.preventDefault()
                            }}
                            onClick={() => handleAdapterClick(id)}
                        >
                            <Icon />
                            <span
                                className={cn(
                                    'upup-text-xs upup-text-[#242634]',
                                    {
                                        'upup-text-gray-300 dark:upup-text-gray-300':
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
                className="upup-hidden"
                data-testid="upup-file-input"
                ref={inputRef}
                multiple={multiple}
                onChange={handleInputFileChange}
            />
            <div className="upup-flex upup-flex-col upup-items-center upup-gap-1 upup-px-3 upup-text-center md:upup-gap-2 md:upup-px-[30px]">
                <div className="upup-flex upup-flex-wrap upup-items-center upup-justify-center upup-gap-1">
                    <span
                        className={cn(
                            'upup-text-xs upup-text-[#0B0B0B] md:upup-text-sm',
                            {
                                'upup-text-white dark:upup-text-white': dark,
                            },
                        )}
                    >
                        Drag your file
                        {limit > 1 ? 's' : ''} or
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
                    {showSelectFolderButton && (
                        <>
                            <span
                                className={cn(
                                    'upup-text-xs upup-text-[#0B0B0B] md:upup-text-sm',
                                    {
                                        'upup-text-white dark:upup-text-white':
                                            dark,
                                    },
                                )}
                            >
                                {' '}
                                or
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
                                onClick={handleSelectFolderClick}
                            >
                                select a folder
                            </button>
                        </>
                    )}
                </div>
                <p
                    className={cn(
                        'upup-text-center upup-text-xs upup-text-[#6D6D6D] md:upup-text-sm',
                        {
                            'upup-text-gray-300 dark:upup-text-gray-300': dark,
                        },
                    )}
                >
                    {maxFileSize?.size && maxFileSize?.unit && (
                        <>
                            Max {maxFileSize.size} {maxFileSize.unit} file
                            {limit > 1 ? 's are ' : ' is '}allowed
                        </>
                    )}
                </p>
            </div>
        </div>
    )
}
