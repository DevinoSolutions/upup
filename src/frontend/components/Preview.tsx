import { AnimatePresence, motion } from 'framer-motion'
import React, { Dispatch, memo, SetStateAction } from 'react'
import { TbPlus } from 'react-icons/tb'
import { v4 as uuidv4 } from 'uuid'
import { useRootContext } from '../context/RootContext'
import { UploadState } from '../lib/storage/provider'
import PreviewComponent from './PreviewComponent'
import ShouldRender from './shared/ShouldRender'

type Props = {
    onAddMore: Dispatch<SetStateAction<boolean>>
}

export default memo(function Preview({ onAddMore }: Props) {
    const {
        files,
        handleReset,
        upload: {
            startAllUploads,
            pauseAllUploads,
            filesStates,
            resumeAllUploads,
        },
    } = useRootContext()

    const handleAddMore = () => onAddMore(true)

    const showUploadAllButton = !Object.keys(filesStates).length
    const showPauseAllButton = Object.values(filesStates).some(
        item => item?.status === UploadState.UPLOADING,
    )
    const showResumeAllButton = Object.values(filesStates).some(
        item => item?.status === UploadState.PAUSED,
    )
    const showDoneButton = Object.values(filesStates).every(
        item => item?.status === UploadState.COMPLETED,
    )

    return (
        <div className="flex h-full flex-col rounded-lg shadow">
            <div className="grid grid-cols-4 items-center justify-between rounded-t-lg border-b border-[#e0e0e0] bg-[#fafafa] px-3 py-2 max-md:grid-rows-2">
                <button
                    className="max-md p-1 text-left text-sm text-blue-600 max-md:col-start-1 max-md:col-end-3 max-md:row-start-2"
                    onClick={handleReset}
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
                <ShouldRender if={showUploadAllButton}>
                    <button
                        className="ml-auto rounded-lg bg-blue-500 px-3 py-2 text-sm font-medium text-white disabled:animate-pulse"
                        onClick={startAllUploads}
                    >
                        Upload {files.length} file{files.length > 1 ? 's' : ''}
                    </button>
                </ShouldRender>
                <ShouldRender if={showPauseAllButton}>
                    <button
                        className="ml-auto rounded-lg bg-blue-500 px-3 py-2 text-sm font-medium text-white disabled:animate-pulse"
                        onClick={pauseAllUploads}
                    >
                        Pause All Uploads
                    </button>
                </ShouldRender>
                <ShouldRender if={showResumeAllButton}>
                    <button
                        className="ml-auto rounded-lg bg-blue-500 px-3 py-2 text-sm font-medium text-white disabled:animate-pulse"
                        onClick={resumeAllUploads}
                    >
                        Resume All Uploads
                    </button>
                </ShouldRender>
                <ShouldRender if={showDoneButton}>
                    <button
                        className="ml-auto rounded-lg bg-blue-500 px-3 py-2 text-sm font-medium text-white disabled:animate-pulse"
                        onClick={handleReset}
                    >
                        Done
                    </button>
                </ShouldRender>
            </div>
        </div>
    )
})
