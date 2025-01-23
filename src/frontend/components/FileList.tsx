import { AnimatePresence, motion } from 'framer-motion'
import React, { memo } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { UploadStatus, useRootContext } from '../context/RootContext'
import FileItem from './FileItem'
import MainBoxHeader from './shared/MainBoxHeader'
import ProgressBar from './shared/ProgressBar'
import ShouldRender from './shared/ShouldRender'

export default memo(function FileList() {
    const {
        files,
        setFiles,
        upload: { proceedUpload, uploadStatus, totalProgress },
        props: { mini },
    } = useRootContext()

    const handleClearFiles = () => setFiles([], true)

    return (
        <div
            className={`relative flex h-full flex-col rounded-lg ${
                mini ? '' : 'pt-[72px] md:pt-11'
            } shadow`}
        >
            <MainBoxHeader handleCancel={handleClearFiles} />

            <AnimatePresence>
                <motion.div className="preview-scroll flex flex-1 flex-col overflow-y-auto bg-[#f4f4f4] p-3 dark:bg-[#1f1f1f]">
                    <div
                        className={`flex gap-4 max-md:flex-col md:grid md:gap-y-6 ${
                            files.length > 1 ? 'sm:grid-cols-3' : 'flex-1'
                        } `}
                    >
                        {files.map(file => (
                            <FileItem key={uuidv4()} file={file} />
                        ))}
                    </div>
                </motion.div>
            </AnimatePresence>
            <div className="flex items-center gap-3 rounded-b-lg border-t border-[#e0e0e0] bg-[#fafafa] px-3 py-2">
                <ShouldRender if={uploadStatus !== UploadStatus.SUCCESSFUL}>
                    <button
                        className="ml-auto rounded-lg bg-blue-500 px-3 py-2 text-sm font-medium text-white disabled:animate-pulse"
                        onClick={proceedUpload}
                        disabled={uploadStatus === UploadStatus.ONGOING}
                    >
                        Upload {files.length} file{files.length > 1 ? 's' : ''}
                    </button>
                </ShouldRender>
                <ShouldRender if={uploadStatus === UploadStatus.SUCCESSFUL}>
                    <button
                        className="ml-auto rounded-lg bg-blue-500 px-3 py-2 text-sm font-medium text-white disabled:animate-pulse"
                        onClick={handleClearFiles}
                    >
                        Done
                    </button>
                </ShouldRender>
                <ProgressBar
                    className="flex-1"
                    progressBarClassName="rounded"
                    progress={totalProgress}
                    showValue
                />
            </div>
        </div>
    )
})
