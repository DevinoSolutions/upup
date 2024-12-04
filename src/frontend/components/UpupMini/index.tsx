import type { Dispatch, FC, LegacyRef, SetStateAction } from 'react'
import React, { useRef } from 'react'

import { AnimatePresence } from 'framer-motion'
import checkFileType from '../../../shared/lib/checkFileType'
import MetaVersion from '../../components/MetaVersion'
import { useDragAndDrop } from '../../hooks'
import { BaseConfigs } from '../../types'
import { FileWithId } from '../../types/file'
import { DropZone } from '../UpupUploader'
import { default as MiniPreview } from './MiniPreview'

type Props = {
    files: File[]
    setFiles: Dispatch<SetStateAction<File[]>>
    maxFileSize: BaseConfigs['maxFileSize']
    handleFileRemove: (file: FileWithId) => void
    baseConfigs?: BaseConfigs
}

export const UpupMini: FC<Props> = ({
    files,
    setFiles,
    maxFileSize,
    handleFileRemove,
    baseConfigs,
}) => {
    const {
        isDragging,
        setIsDragging,
        handleDragEnter,
        handleDragLeave,
        containerRef,
    } = useDragAndDrop()

    const inputRef = useRef<HTMLInputElement>(null)

    return (
        <div
            className="relative flex h-[min(98svh,12rem)] w-full max-w-[min(98svh,12rem)] select-none flex-col overflow-hidden rounded-md border bg-[#f4f4f4] dark:bg-[#1f1f1f]"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            ref={containerRef as LegacyRef<HTMLDivElement>}
        >
            <AnimatePresence>
                {isDragging && (
                    <DropZone
                        setFiles={setFiles}
                        setIsDragging={setIsDragging}
                        accept="image/*"
                        multiple={false}
                        baseConfigs={baseConfigs}
                    />
                )}
            </AnimatePresence>
            <input
                type="file"
                accept="image/*"
                className="absolute h-0 w-0"
                ref={inputRef}
                onChange={e => {
                    const acceptedFile = Array.from(
                        e.target.files as FileList,
                    ).filter(file =>
                        checkFileType(
                            'image/*',
                            file,
                            baseConfigs?.onFileTypeMismatch,
                        ),
                    )

                    setFiles(() => [...acceptedFile])
                    e.target.value = ''
                }}
            />

            <MiniPreview
                files={files}
                setFiles={setFiles}
                handleFileRemove={handleFileRemove}
            />
            <div className="h-full p-2">
                <div className="grid h-full w-full grid-rows-[1fr,auto] place-items-center rounded-md border border-dashed border-[#dfdfdf] transition-all">
                    <h1 className="text-center dark:text-white">
                        Drop your files here or{' '}
                        <button
                            className="text-[#3782da] hover:underline"
                            onClick={() =>
                                inputRef && inputRef.current!.click()
                            }
                            type="button"
                        >
                            Click to browse
                        </button>
                    </h1>
                    <MetaVersion limit={1} maxFileSize={maxFileSize} />
                </div>
            </div>
        </div>
    )
}

export { default as MiniPreview } from './MiniPreview'
