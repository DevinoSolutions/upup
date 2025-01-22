import { AnimatePresence, motion } from 'framer-motion'
import React, { memo, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useRootContext } from '../context/RootContext'
import PreviewComponent from './PreviewComponent'
import MainBoxHeader from './shared/MainBoxHeader'
import ShouldRender from './shared/ShouldRender'

export default memo(function Preview() {
    const [isUploadDone, setIsUploadDone] = useState(false)
    const {
        files,
        setFiles,
        upload: { proceedUpload, isUploading },
    } = useRootContext()

    const handleClearFiles = () => setFiles([], true)
    const handleUpload = async () => {
        await proceedUpload()
        setIsUploadDone(true)
    }

    return (
        <div className="relative flex h-full flex-col rounded-lg pt-11 shadow">
            <MainBoxHeader handleCancel={handleClearFiles} />

            <AnimatePresence>
                <motion.div className="preview-scroll flex-1 overflow-y-auto bg-[#f4f4f4] p-3 dark:bg-[#1f1f1f]">
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
