'use client'

import React, { useCallback } from 'react'
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
        resolvedTheme,
        addFiles,
        activeSource,
        t,
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

    const handleTabListKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            const tabs = Array.from(
                e.currentTarget.querySelectorAll('[role="tab"]'),
            ) as HTMLElement[]
            const currentIndex = tabs.indexOf(e.target as HTMLElement)
            if (currentIndex === -1) return

            let nextIndex: number | null = null
            if (e.key === 'ArrowRight') {
                nextIndex = (currentIndex + 1) % tabs.length
            } else if (e.key === 'ArrowLeft') {
                nextIndex = (currentIndex - 1 + tabs.length) % tabs.length
            }

            if (nextIndex !== null) {
                e.preventDefault()
                tabs[nextIndex].focus()
            }
        },
        [],
    )

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
            data-upup-slot="sourceSelector.root"
        >
            {!mini && (
                <div
                    role="tablist"
                    aria-label="Upload sources"
                    onKeyDown={handleTabListKeyDown}
                    className="upup-flex upup-w-full upup-flex-col upup-justify-center upup-gap-1 md:upup-flex-row md:upup-flex-wrap md:upup-items-center md:upup-gap-[30px] md:upup-px-[30px]"
                    data-upup-slot="sourceSelector.adapterList"
                >
                    {chosenAdapters.map(({ Icon, id, nameKey }) => (
                        <button
                            key={id}
                            type="button"
                            role="tab"
                            aria-selected={activeSource === id}
                            className="upup-group upup-flex upup-items-center upup-gap-[6px] upup-rounded-lg upup-px-3 upup-py-2 upup-transition-colors hover:upup-opacity-80 md:upup-flex-col md:upup-justify-center md:upup-p-3"
                            style={{
                                backgroundColor: activeSource === id ? 'var(--upup-color-drag-bg)' : undefined,
                                borderColor: 'var(--upup-color-border)',
                            }}
                            onClick={() => handleAdapterClick(id)}
                            data-upup-slot="sourceSelector.adapterButton"
                        >
                            {Icon && (
                                <Icon
                                    size={24}
                                />
                            )}
                            <span
                                className="upup-text-xs"
                                style={{ color: 'var(--upup-color-text-muted)' }}
                                data-upup-slot="sourceSelector.adapterButtonText"
                            >
                                {t(nameKey as any)}
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
                        className="upup-h-16 upup-w-16 md:upup-h-20 md:upup-w-20"
                        style={{ color: 'var(--upup-color-text)' }}
                    />
                    <p
                        className="px-6 upup-text-center upup-text-xs"
                        style={{ color: 'var(--upup-color-text-muted)' }}
                    >
                        {t('dropzone.dragOrBrowse')}
                    </p>
                </button>
            ) : (
                <div className="upup-flex upup-flex-col upup-items-center upup-gap-1 upup-px-3 upup-text-center md:upup-gap-2 md:upup-px-[30px]">
                    <div className="upup-flex upup-flex-wrap upup-items-center upup-justify-center upup-gap-1">
                        <span
                            className="upup-text-xs md:upup-text-sm"
                            style={{ color: 'var(--upup-color-text)' }}
                            data-upup-slot="sourceSelector.dragText"
                        >
                            {t('dropzone.dragFilesOr', { count: 2 })}
                        </span>
                        <button
                            type="button"
                            className="upup-cursor-pointer upup-text-xs upup-font-semibold md:upup-text-sm"
                            style={{ color: 'var(--upup-color-primary-hover)' }}
                            onClick={handleBrowseFilesClick}
                            data-upup-slot="sourceSelector.browseText"
                        >
                            {t('dropzone.browseFiles')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
