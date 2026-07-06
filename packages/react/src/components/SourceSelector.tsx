import React, { useCallback } from 'react'
import Icon from './Icon'
import { formatUiMessage as t, pluralUiMessage as plural } from '@upup/core'
import { cn } from '@upup/core/internal'
import {
    useUploaderFiles,
    useUploaderI18n,
    useUploaderOptions,
    useUploaderRuntime,
    useUploaderTheme,
    useUploaderView,
} from '../context/UploaderContext'
import useSourceSelector from '../hooks/useSourceSelector'

export default function SourceSelector(): React.ReactElement | null {
    const { core, inputRef, openFilePicker } = useUploaderRuntime()
    const { translations: tr } = useUploaderI18n()
    const { isAddingMore, setIsAddingMore } = useUploaderView()
    const { setFiles } = useUploaderFiles()
    const { isDark: dark, slotOverrides: slotClasses } = useUploaderTheme()
    const {
        mini,
        allowedFileTypes,
        multiple,
        limit,
        maxFileSize,
        folderPickerButtonVisible,
    } = useUploaderOptions()

    const constraintParts: string[] = []
    if (
        allowedFileTypes &&
        allowedFileTypes !== '*/*' &&
        allowedFileTypes !== '*'
    ) {
        const humanized = allowedFileTypes
            .split(',')
            .map(s => s.trim())
            .map(m => {
                if (m.startsWith('.')) return m
                const [type, sub] = m.split('/')
                if (!type || !sub) return m
                if (sub === '*')
                    return type.charAt(0).toUpperCase() + type.slice(1) + 's'
                return sub.toUpperCase()
            })
            .join(', ')
        constraintParts.push(humanized + ' only')
    }
    if (limit > 1) {
        constraintParts.push(t(tr.addDocumentsHere, { limit }))
    }
    if (maxFileSize?.size && maxFileSize?.unit)
        constraintParts.push(
            t(plural(tr, 'maxFileSizeAllowed', limit), {
                size: maxFileSize.size,
                unit: maxFileSize.unit,
            }),
        )
    const constraintLine = constraintParts.join(', ')
    const { chosenSources, handleSourceClick, handleInputFileChange } =
        useSourceSelector()

    const handleBrowseFilesClick = useCallback(() => {
        if (inputRef.current) {
            inputRef.current.removeAttribute('webkitdirectory')
            inputRef.current.removeAttribute('directory')
        }
        openFilePicker()
        core?.emit('browse-files', {})
    }, [core, inputRef, openFilePicker])

    const handleSelectFolderClick = useCallback(async () => {
        const fsWindow = window as Window & {
            showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>
        }
        if (fsWindow.showDirectoryPicker) {
            try {
                const directoryHandle = await fsWindow.showDirectoryPicker()
                const files: File[] = []

                type IterableDirHandle = {
                    values(): AsyncIterableIterator<
                        FileSystemHandle & {
                            kind: string
                            getFile: () => Promise<File>
                        }
                    >
                }
                async function getFiles(
                    dirHandle: IterableDirHandle,
                    path = '',
                ) {
                    for await (const entry of dirHandle.values()) {
                        const newPath = path
                            ? `${path}/${entry.name}`
                            : entry.name
                        if (entry.kind === 'file') {
                            const pickedFile = await entry.getFile()
                            const file = new File(
                                [await pickedFile.arrayBuffer()],
                                pickedFile.name,
                                {
                                    type: pickedFile.type,
                                    lastModified: pickedFile.lastModified,
                                },
                            )
                            try {
                                Object.defineProperty(
                                    file,
                                    'webkitRelativePath',
                                    {
                                        value: newPath,
                                        configurable: true,
                                        writable: true,
                                    },
                                )
                                Object.defineProperty(file, 'relativePath', {
                                    value: newPath,
                                    configurable: true,
                                    writable: true,
                                })
                            } catch {
                                Object.assign(file, { relativePath: newPath })
                            }
                            files.push(file)
                        } else if (entry.kind === 'directory') {
                            await getFiles(
                                entry as unknown as IterableDirHandle,
                                newPath,
                            )
                        }
                    }
                }
                await getFiles(directoryHandle as unknown as IterableDirHandle)
                if (files.length > 0) {
                    setFiles(files)
                    core?.emit('folder-select', { count: files.length })
                    if (inputRef.current) {
                        inputRef.current.value = ''
                    }
                }
            } catch (error) {
                const name = error instanceof DOMException ? error.name : ''
                if (name !== 'AbortError') {
                    throw error
                }
                // User cancelled, do nothing.
            }
        } else {
            // Fallback to existing behavior
            if (inputRef.current) {
                inputRef.current.setAttribute('webkitdirectory', 'true')
                inputRef.current.setAttribute('directory', 'true')
            }
            openFilePicker()
            core?.emit('folder-select', { count: 0 })
        }
    }, [core, inputRef, openFilePicker, setFiles])

    return (
        <div
            data-testid="upup-source-selector"
            data-upup-slot="source-selector"
            className={cn(
                'upup-relative upup-flex upup-h-full upup-gap-3 upup-rounded-lg',
                {
                    'upup-flex-col': isAddingMore,
                    'upup-flex-col-reverse upup-items-center upup-justify-center md:upup-flex-col md:upup-gap-14':
                        !isAddingMore,
                },
            )}
        >
            {isAddingMore && (
                <div
                    className={cn(
                        'upup-shadow-bottom upup-flex upup-w-full upup-items-center upup-rounded-t-lg upup-bg-black/[0.025] upup-px-3 upup-py-2',
                        {
                            'upup-bg-white/5 dark:upup-bg-white/5': dark,
                        },
                        slotClasses.containerHeader,
                    )}
                >
                    <button
                        className={cn(
                            'upup-flex upup-items-center upup-gap-1 upup-text-sm upup-font-medium upup-text-blue-600',
                            {
                                'upup-text-[#30C5F7] dark:upup-text-[#30C5F7]':
                                    dark,
                            },
                            slotClasses.containerCancelButton,
                        )}
                        onClick={() => { setIsAddingMore(false); }}
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
            )}
            {!mini && (
                <div
                    className={cn(
                        'upup-flex upup-w-full upup-flex-col upup-justify-center upup-gap-1 md:upup-flex-row md:upup-flex-wrap md:upup-items-center md:upup-gap-[30px] md:upup-px-[30px]',
                        slotClasses.sourceButtonList,
                    )}
                >
                    {chosenSources.map(({ Icon, id, name }) => (
                        <button
                            key={id}
                            type="button"
                            data-testid={`upup-source-${id}`}
                            className={cn(
                                'upup-group upup-flex upup-items-center upup-gap-[6px] upup-border-b upup-border-gray-200 upup-px-2 upup-py-1 md:upup-flex-col md:upup-justify-center md:upup-rounded-lg md:upup-border-none md:upup-p-0',
                                {
                                    'upup-border-[#6D6D6D] dark:upup-border-[#6D6D6D]':
                                        dark,
                                },
                                slotClasses.sourceButton,
                            )}
                            onKeyDown={e => {
                                if (e.key === 'Enter') e.preventDefault()
                            }}
                            onClick={() => { handleSourceClick(id); }}
                        >
                            <Icon
                                className={
                                    slotClasses.sourceButtonIcon ?? undefined
                                }
                            />
                            <span
                                className={cn(
                                    'upup-text-xs upup-text-[#242634]',
                                    {
                                        'upup-text-gray-300 dark:upup-text-gray-300':
                                            dark,
                                    },
                                    slotClasses.sourceButtonText,
                                )}
                            >
                                {name}
                            </span>
                        </button>
                    ))}
                </div>
            )}
            <input
                type="file"
                name="upup-files"
                accept={allowedFileTypes}
                className="upup-hidden"
                data-testid="upup-file-input"
                aria-hidden="true"
                tabIndex={-1}
                ref={inputRef}
                multiple={multiple}
                onChange={handleInputFileChange}
            />
            {mini ? (
                <button
                    type="button"
                    onClick={handleBrowseFilesClick}
                    className="upup-flex upup-cursor-pointer upup-flex-col upup-items-center upup-justify-center upup-gap-2 upup-rounded-lg upup-p-2"
                >
                    <Icon
                        name="upload"
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
                            'upup-text-[#6D6D6D] dark:upup-text-gray-400':
                                !dark,
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
                                {
                                    'upup-text-white dark:upup-text-white':
                                        dark,
                                },
                            )}
                        >
                            {limit > 1 ? tr.dragFilesOr : tr.dragFileOr}
                        </span>
                        <button
                            type="button"
                            data-testid="upup-browse-files"
                            className={cn(
                                'upup-cursor-pointer upup-text-xs upup-font-semibold upup-text-[#0E2ADD] md:upup-text-sm',
                                {
                                    'upup-text-[#59D1F9] dark:upup-text-[#59D1F9]':
                                        dark,
                                },
                            )}
                            onClick={handleBrowseFilesClick}
                        >
                            {tr.browseFiles}
                        </button>
                        {folderPickerButtonVisible && (
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
                                    {tr.or}
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
                                    {tr.selectAFolder}
                                </button>
                            </>
                        )}
                    </div>
                    {constraintLine && (
                        <p
                            className={cn(
                                'upup-text-center upup-text-xs upup-text-[#6D6D6D] md:upup-text-sm',
                                {
                                    'upup-text-gray-300 dark:upup-text-gray-300':
                                        dark,
                                },
                            )}
                        >
                            {constraintLine}
                        </p>
                    )}
                </div>
            )}
        </div>
    )
}
