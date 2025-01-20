import { AnimatePresence, motion } from 'framer-motion'
import React, { Dispatch, memo, SetStateAction, useState } from 'react'
import { TbPlus } from 'react-icons/tb'
import { v4 as uuidv4 } from 'uuid'
import { useRootContext } from '../context/RootContext'
import PreviewComponent from './PreviewComponent'
import ShouldRender from './shared/ShouldRender'

type Props = {
    onAddMore: Dispatch<SetStateAction<boolean>>
}

export default memo(function Preview({ onAddMore }: Props) {
    const [isUploadDone, setIsUploadDone] = useState(false)
    const {
        files,
        setFiles,
        upload: { proceedUpload, isUploading },
    } = useRootContext()

    const handleClearFiles = () => setFiles([], true)
    const handleAddMore = () => onAddMore(true)
    const handleUpload = async () => {
        await proceedUpload()
        setIsUploadDone(true)
    }

    return (
        <div className="flex h-full flex-col rounded-lg shadow">
            <div className="grid grid-cols-4 items-center justify-between rounded-t-lg border-b border-[#e0e0e0] bg-[#fafafa] px-3 py-2 max-md:grid-rows-2">
                <button
                    className="max-md p-1 text-left text-sm text-blue-600 max-md:col-start-1 max-md:col-end-3 max-md:row-start-2"
                    onClick={handleClearFiles}
                >
                    Cancel
                </button>
                <span className="text-center text-sm max-md:col-span-4 md:col-span-2">
                    {files.length} files selected
                </span>
                <button
                    className="flex items-center justify-end gap-1 p-1 text-sm text-blue-600 max-md:col-start-3 max-md:col-end-5"
                    onClick={handleAddMore}
                >
                    <TbPlus /> Add More
                </button>
            </div>
            <AnimatePresence>
                <motion.div className="preview-scroll flex-1 overflow-y-auto bg-[#f4f4f4] p-3">
                    <div className="flex gap-4 max-md:flex-col md:flex-wrap md:gap-y-6 md:after:flex-shrink-0 md:after:flex-grow md:after:basis-80 md:after:content-['']">
                        {files.map(file => (
                            <PreviewComponent
                                key={uuidv4()}
                                file={file}
                                index={files.indexOf(file)}
                            />
                        ))}
                    </div>
                </motion.div>
            </AnimatePresence>
            <div className="rounded-b-lg border-t border-[#e0e0e0] bg-[#fafafa] px-3 py-2">
                <ShouldRender if={!isUploadDone}>
                    <button
                        className="ml-auto rounded-lg bg-blue-500 px-3 py-2 text-sm font-medium text-white disabled:animate-pulse"
                        onClick={handleUpload}
                        disabled={isUploading}
                    >
                        Upload {files.length} file{files.length > 1 ? 's' : ''}
                    </button>
                </ShouldRender>
                <ShouldRender if={!!isUploadDone}>
                    <button
                        className="ml-auto rounded-lg bg-blue-500 px-3 py-2 text-sm font-medium text-white disabled:animate-pulse"
                        onClick={handleClearFiles}
                    >
                        Done
                    </button>
                </ShouldRender>
            </div>
        </div>
    )
})
