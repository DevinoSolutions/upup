import { Dispatch, FC, SetStateAction } from 'react'
import { motion } from 'framer-motion'
import { TbUpload } from 'react-icons/tb'

type Props = {
    setFiles: Dispatch<SetStateAction<File[]>>
    setIsDragging: Dispatch<SetStateAction<boolean>>
}

const MiniDropZone: FC<Props> = ({ setFiles, setIsDragging }: Props) => {
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
            <div className="border h-full w-full border-dashed border-current rounded-md flex items-center justify-center text-xl flex-col gap-2 text-center">
                <i className="border-2 border-current p-3 rounded-full">
                    <TbUpload />
                </i>
                <p className="text-lg">Drop your files here</p>
            </div>
            <input
                type="file"
                className="w-full h-full absolute top-0 opacity-0"
                multiple={false}
                onChange={e => {
                    setFiles(() => [e.target.files![0]])
                    setIsDragging(false)
                }}
                onDrop={e => {
                    e.preventDefault()
                    setFiles(() => [[...Array.from(e.dataTransfer.files)][0]])
                    setIsDragging(false)
                }}
            />
        </motion.div>
    )
}

export default MiniDropZone
