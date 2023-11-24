import type { Dispatch, FC, LegacyRef, SetStateAction } from 'react'
import { useRef } from 'react'

import { AnimatePresence } from 'framer-motion'
import { useDragAndDrop } from 'hooks'
import { checkFileType } from 'lib'
import { BaseConfigs } from 'types'
import MetaVersion from '../MetaVersion'
import { default as MiniDropZone } from './MiniDropZone'
import { default as MiniPreview } from './MiniPreview'

type Props = {
    files: File[]
    setFiles: Dispatch<SetStateAction<File[]>>
    maxFileSize: BaseConfigs['maxFileSize']
}

export const UpupMini: FC<Props> = ({
    files,
    setFiles,
    maxFileSize,
}: Props) => {
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
            className="w-full max-w-[min(98svh,12rem)] bg-[#f4f4f4] h-[min(98svh,12rem)] rounded-md border flex flex-col relative overflow-hidden select-none dark:bg-[#1f1f1f]"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            ref={containerRef as LegacyRef<HTMLDivElement>}
        >
            <AnimatePresence>
                {isDragging && (
                    <MiniDropZone
                        setFiles={setFiles}
                        setIsDragging={setIsDragging}
                    />
                )}
            </AnimatePresence>
            <input
                type="file"
                accept="image/*"
                className="absolute w-0 h-0"
                ref={inputRef}
                onChange={e => {
                    const acceptedFile = Array.from(
                        e.target.files as FileList,
                    ).filter(file => checkFileType(file, 'image/*'))

                    setFiles(() => [...acceptedFile])
                    e.target.value = ''
                }}
            />

            <MiniPreview files={files} setFiles={setFiles} />
            <div className="p-2 h-full">
                <div className="border-[#dfdfdf] border-dashed h-full w-full grid grid-rows-[1fr,auto] place-items-center border rounded-md transition-all">
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

export { default as MiniDropZone } from './MiniDropZone'
export { default as MiniPreview } from './MiniPreview'
