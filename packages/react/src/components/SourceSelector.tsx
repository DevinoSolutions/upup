import React, { useCallback } from 'react'
import Icon from './Icon'
import { StackedFilesIcon, StorageIcon } from './Icons'
import { formatUiMessage as t, pluralUiMessage as plural } from '@upupjs/core'
import { cn } from '@upupjs/core/internal'
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
    // eslint-disable-next-line @typescript-eslint/no-deprecated -- inputRef is required for direct webkitdirectory/directory DOM wiring; openFilePicker() cannot toggle those attributes
    const { core, inputRef, openFilePicker } = useUploaderRuntime()
    const { translations: tr } = useUploaderI18n()
    const { sourceOverlayOpen, closeSourceOverlay } = useUploaderView()
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

    // Idle limits caption (data-upup-slot="limits-caption"): iconified file-count
    // and per-file size limits, plus a leading text-only type-restriction segment
    // so no constraint the consumer configured is dropped. Each segment renders
    // only when its limit is actually set.
    let typeConstraint: string | null = null
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
        typeConstraint = humanized + ' only'
    }
    const showFilesLimit = limit > 1
    const showSizeLimit = !!(maxFileSize?.size && maxFileSize?.unit)
    const hasLimitsCaption = !!typeConstraint || showFilesLimit || showSizeLimit
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
                                // upup-catch: defineProperty can throw on frozen File in some engines; Object.assign is the fallback path
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
                'upup-animate-fx-view upup-relative upup-flex upup-h-full upup-flex-col upup-gap-6 upup-rounded-lg',
                {
                    'upup-items-center upup-justify-center upup-px-4 upup-py-6':
                        !sourceOverlayOpen,
                },
            )}
        >
            {sourceOverlayOpen && (
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
                            'upup-flex upup-items-center upup-gap-1 upup-text-sm upup-font-medium upup-text-[#0284c7]',
                            {
                                'upup-text-[#38bdf8] dark:upup-text-[#38bdf8]':
                                    dark,
                            },
                            slotClasses.containerCancelButton,
                        )}
                        onClick={() => {
                            closeSourceOverlay()
                        }}
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
                        {tr.overlayBack}
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
                        {tr.addingMoreFiles}
                    </span>
                </div>
            )}
            {!mini && (
                <>
                    <div
                        className={cn(
                            'upup-flex upup-flex-wrap upup-items-center upup-justify-center upup-gap-x-1.5 upup-gap-y-1 upup-px-2 upup-text-center upup-text-base upup-font-medium md:upup-text-lg',
                            {
                                'upup-text-[#242634]': !dark,
                                'upup-text-[#e2e8f0] dark:upup-text-[#e2e8f0]':
                                    dark,
                            },
                        )}
                    >
                        <span>{tr.dropFilesHere}</span>
                        <button
                            type="button"
                            data-testid="upup-browse-files"
                            className={cn(
                                'upup-cursor-pointer upup-rounded upup-font-semibold focus-visible:upup-outline-none focus-visible:upup-ring-2 focus-visible:upup-ring-[#38bdf8]',
                                {
                                    'upup-text-[#0284c7]': !dark,
                                    'upup-text-[#38bdf8] dark:upup-text-[#38bdf8]':
                                        dark,
                                },
                            )}
                            onClick={handleBrowseFilesClick}
                        >
                            {tr.browseFiles}
                        </button>
                        {folderPickerButtonVisible && (
                            <>
                                <span>{tr.or}</span>
                                <button
                                    type="button"
                                    className={cn(
                                        'upup-cursor-pointer upup-rounded upup-font-semibold focus-visible:upup-outline-none focus-visible:upup-ring-2 focus-visible:upup-ring-[#38bdf8]',
                                        {
                                            'upup-text-[#0284c7]': !dark,
                                            'upup-text-[#38bdf8] dark:upup-text-[#38bdf8]':
                                                dark,
                                        },
                                    )}
                                    onClick={() => {
                                        void handleSelectFolderClick()
                                    }}
                                >
                                    {tr.selectAFolder}
                                </button>
                            </>
                        )}
                        <span>{tr.orImportFrom}</span>
                    </div>
                    <div
                        className={cn(
                            'upup-flex upup-max-w-[420px] upup-flex-wrap upup-items-start upup-justify-center upup-gap-x-6 upup-gap-y-5',
                            slotClasses.sourceButtonList,
                        )}
                    >
                        {chosenSources.map(({ Icon, id, name }) => (
                            <button
                                key={id}
                                type="button"
                                data-testid={`upup-source-${id}`}
                                className={cn(
                                    'upup-fx-hover-lift upup-fx-press upup-fx-icon-nudge upup-group upup-flex upup-w-[66px] upup-cursor-pointer upup-flex-col upup-items-center upup-gap-[9px] upup-rounded-[14px] focus-visible:upup-outline-none focus-visible:upup-ring-2 focus-visible:upup-ring-[#38bdf8]',
                                    slotClasses.sourceButton,
                                )}
                                onClick={() => {
                                    handleSourceClick(id)
                                }}
                            >
                                <span
                                    className={cn(
                                        'upup-flex upup-h-[52px] upup-w-[52px] upup-items-center upup-justify-center upup-rounded-[14px] upup-ring-1 upup-transition-colors',
                                        {
                                            'upup-bg-white upup-shadow-[0_1px_3px_rgba(15,23,42,0.1)] upup-ring-black/[0.07] group-hover:upup-bg-slate-50':
                                                !dark,
                                            'upup-bg-white/[0.055] upup-ring-white/[0.06] group-hover:upup-bg-white/[0.09] dark:upup-bg-white/[0.055] dark:upup-ring-white/[0.06]':
                                                dark,
                                        },
                                    )}
                                >
                                    <Icon
                                        className={cn(
                                            // The registry glyphs carry ~30% internal
                                            // viewBox padding; a 32px box lands the
                                            // visible glyph at the mockup's ~20px.
                                            'upup-h-8 upup-w-8',
                                            slotClasses.sourceButtonIcon,
                                        )}
                                    />
                                </span>
                                <span
                                    className={cn(
                                        'upup-text-xs upup-leading-none',
                                        {
                                            'upup-text-[#6D6D6D]': !dark,
                                            'upup-text-[#94a3b8] dark:upup-text-[#94a3b8]':
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
                </>
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
                hasLimitsCaption && (
                    <div
                        data-upup-slot="limits-caption"
                        className={cn(
                            'upup-flex upup-flex-wrap upup-items-center upup-justify-center upup-gap-x-2.5 upup-gap-y-1 upup-px-3 upup-text-center upup-text-xs',
                            {
                                'upup-text-[#6D6D6D]': !dark,
                                'upup-text-[#94a3b8] dark:upup-text-[#94a3b8]':
                                    dark,
                            },
                        )}
                    >
                        {typeConstraint && <span>{typeConstraint}</span>}
                        {typeConstraint &&
                            (showFilesLimit || showSizeLimit) && (
                                <span aria-hidden="true">&middot;</span>
                            )}
                        {showFilesLimit && (
                            <span className="upup-inline-flex upup-items-center upup-gap-1.5">
                                <span
                                    aria-hidden="true"
                                    className="upup-inline-flex"
                                >
                                    <StackedFilesIcon className="upup-h-4 upup-w-4" />
                                </span>
                                {t(plural(tr, 'filesMax', limit), {
                                    count: limit,
                                })}
                            </span>
                        )}
                        {showFilesLimit && showSizeLimit && (
                            <span aria-hidden="true">&middot;</span>
                        )}
                        {showSizeLimit && (
                            <span className="upup-inline-flex upup-items-center upup-gap-1.5">
                                <span
                                    aria-hidden="true"
                                    className="upup-inline-flex"
                                >
                                    <StorageIcon className="upup-h-4 upup-w-4" />
                                </span>
                                {t(tr.sizeEach, {
                                    size: maxFileSize?.size ?? 0,
                                    unit: maxFileSize?.unit ?? '',
                                })}
                            </span>
                        )}
                    </div>
                )
            )}
        </div>
    )
}
