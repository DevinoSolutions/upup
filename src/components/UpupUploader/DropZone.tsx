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
            className="h-full w-full bg-gray-300 absolute z-40 bg-opacity-50 p-2 text-blue-600 dark:bg-[#1f1f1f] dark:bg-opacity-70 backdrop-blur-sm rounded-md"
            onDragOver={e => {
                e.preventDefault()
                setIsDragging(true)
                e.dataTransfer.dropEffect = 'copy'
            }}
        >
            <div className="border h-full w-full border-dashed border-current rounded-md flex items-center justify-center text-4xl flex-col gap-2">
                <i className="border-2 border-current p-3 rounded-full">
                    <TbUpload />
                </i>
                <p className="text-xl">Drop your files here</p>
            </div>
            <input
                type="file"
                accept={accept}
                className="w-full h-full absolute top-0 opacity-0"
                multiple
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
                onDrop={e => {
                    e.preventDefault()
                    setFiles(prev => {
                        const acceptedFiles = Array.from(
                            e.dataTransfer.files,
                        ).filter(file => checkFileType(file, accept))

                        return multiple
                            ? [...prev, ...acceptedFiles]
                            : // only one file
                              [acceptedFiles[0]]
                    })
                    setIsDragging(false)
                }}
            />
        </motion.div>
    )
}

export default DropZone
