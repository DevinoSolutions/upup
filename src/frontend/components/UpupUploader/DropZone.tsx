import { motion } from 'framer-motion'
import { checkFileType } from 'lib'
import { Dispatch, FC, SetStateAction } from 'react'
import { TbUpload } from 'react-icons/tb'

type Props = {
    setFiles: Dispatch<SetStateAction<File[]>>
    setIsDragging: Dispatch<SetStateAction<boolean>>
    multiple?: boolean
    accept?: string
}

const DropZone: FC<Props> = ({
    setFiles,
    setIsDragging,
    multiple,
    accept = '*',
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
            }}
        >
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-current text-4xl">
                <i className="rounded-full border-2 border-current p-3">
                    <TbUpload />
                </i>
                <p className="text-xl">Drop your files here</p>
            </div>
            <input
                type="file"
                accept={accept}
                className="absolute top-0 h-full w-full opacity-0"
                multiple
                onChange={e => {
                    const acceptedFiles = Array.from(
                        e.target.files as FileList,
                    ).filter(file => checkFileType(accept, file.type))

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
                onDrop={e => {
                    e.preventDefault()
                    setFiles(prev => {
                        const acceptedFiles = Array.from(
                            e.dataTransfer.files,
                        ).filter(file => checkFileType(accept, file.type))

                        return multiple
                            ? [...prev, ...acceptedFiles]
                            : // only one file
                              [acceptedFiles[0]].filter(Boolean)
                    })
                    setIsDragging(false)
                }}
            />
        </motion.div>
    )
}

export default DropZone
