import { motion } from 'framer-motion'
import { checkFileType } from 'lib'
import { Dispatch, FC, SetStateAction } from 'react'
import { TbUpload } from 'react-icons/tb'
import { BaseConfigs } from 'types'

type Props = {
    setFiles: Dispatch<SetStateAction<File[]>>
    setIsDragging: Dispatch<SetStateAction<boolean>>
    multiple?: boolean
    accept?: string
    baseConfigs?: BaseConfigs
}

const DropZone: FC<Props> = ({
    setFiles,
    setIsDragging,
    multiple,
    accept = '*',
    baseConfigs,
}: Props) => {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute z-40 h-full w-full rounded-md bg-gray-300 bg-opacity-50 p-2 text-blue-600 backdrop-blur-sm dark:bg-[#1f1f1f] dark:bg-opacity-70"
            onDragOver={e => {
                e.preventDefault()
                setIsDragging(true)
                e.dataTransfer.dropEffect = 'copy'

                const files = Array.from(e.dataTransfer.files)
                baseConfigs?.onFileDragOver?.(files)
            }}
            onDragLeave={e => {
                e.preventDefault()
                setIsDragging(false)

                const files = Array.from(e.dataTransfer.files)
                baseConfigs?.onFileDragLeave?.(files)
            }}
            onDrop={e => {
                e.preventDefault()
                setFiles(prev => {
                    const acceptedFiles = Array.from(
                        e.dataTransfer.files,
                    ).filter(file => checkFileType(file, accept))

                    baseConfigs?.onFileDrop?.(acceptedFiles)
                    if (multiple) return [...prev, ...acceptedFiles]

                    // For single file mode, take the first valid file if it exists
                    return acceptedFiles.length > 0 ? [acceptedFiles[0]] : []
                })
                setIsDragging(false)
            }}
        >
            <div
                className={`flex h-full w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-current
                    ${!multiple ? 'text-center text-xl' : 'text-4xl'}`}
            >
                <i className="rounded-full border-2 border-current p-3">
                    <TbUpload />
                </i>
                <p className={`${!multiple ? 'text-xl' : 'text-lg'}`}>
                    Drop your files here
                </p>
            </div>
            <input
                type="file"
                accept={accept}
                className="absolute top-0 h-full w-full opacity-0"
                multiple={multiple}
                onChange={e => {
                    const acceptedFiles = Array.from(
                        e.target.files as FileList,
                    ).filter(file => checkFileType(file, accept))
                    setFiles(prev =>
                        multiple
                            ? [...prev, ...acceptedFiles]
                            : // only one file
                              [acceptedFiles[0]],
                    )

                    setIsDragging(false)

                    // reset input
                    e.target.value = ''
                }}
            />
        </motion.div>
    )
}

export default DropZone
