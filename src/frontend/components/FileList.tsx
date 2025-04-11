import { motion } from 'framer-motion'
import React, { memo } from 'react'
import { UploadStatus, useRootContext } from '../context/RootContext'
import { cn } from '../lib/tailwind'
import FileItem from './FileItem'
import MainBoxHeader from './shared/MainBoxHeader'
import MyAnimatePresence from './shared/MyAnimatePresence'
import ProgressBar from './shared/ProgressBar'
import ShouldRender from './shared/ShouldRender'

export default memo(function FileList() {
    const {
        isAddingMore,
        activeAdapter,
        files,
        upload: { proceedUpload, uploadStatus, totalProgress },
        props: { mini, dark, classNames, allowPreview, isProcessing },
        handleDone,
        handleCancel,
    } = useRootContext()

    return (
        <div
            className={cn(
                'upup-relative upup-flex upup-h-full upup-flex-col upup-rounded-lg upup-shadow',
                {
                    'upup-pt-[72px] md:upup-pt-11': !mini,
                    'upup-hidden': isAddingMore || activeAdapter || !files.size,
                },
            )}
        >
            <MainBoxHeader handleCancel={handleCancel} />

            <MyAnimatePresence>
                <motion.div
                    className={cn(
                        'upup-preview-scroll upup-flex upup-flex-1 upup-flex-col upup-overflow-y-auto upup-bg-black/[0.075] upup-p-3',
                        { 'upup-bg-white/10 dark:upup-bg-white/10': dark },
                        classNames.fileListContainer,
                    )}
                >
                    <div
                        className={cn(
                            // Always-on classes
                            ` ${
                                isProcessing &&
                                'upup-pointer-events-none upup-opacity-75'
                            }  upup-flex upup-flex-col upup-gap-4`,
                            {
                                'md:upup-grid md:upup-gap-y-6': allowPreview,
                                'md:upup-grid-cols-3':
                                    allowPreview && files.size > 1,
                                'upup-flex-1': files.size === 1 && allowPreview,
                                [classNames.fileListContainerInnerMultiple!]:
                                    classNames.fileListContainerInnerMultiple &&
                                    files.size > 1,
                                [classNames.fileListContainerInnerSingle!]:
                                    classNames.fileListContainerInnerSingle &&
                                    files.size === 1,
                            },
                        )}
                    >
                        {Array.from(files.values()).map(file => (
                            <FileItem key={file.id} file={file} />
                        ))}
                    </div>
                </motion.div>
            </MyAnimatePresence>
            <div
                className={cn(
                    'upup-shadow-top upup-flex upup-items-center upup-gap-3 upup-rounded-b-lg upup-bg-black/[0.025] upup-px-3 upup-py-2',
                    {
                        'upup-bg-white/5 dark:upup-bg-white/5': dark,
                    },
                    classNames.fileListFooter,
                )}
            >
                <ShouldRender if={uploadStatus !== UploadStatus.SUCCESSFUL}>
                    <button
                        className={cn(
                            'upup-disabled:animate-pulse upup-ml-auto upup-rounded-lg upup-bg-blue-600 upup-px-3 upup-py-2 upup-text-sm upup-font-medium upup-text-white',
                            {
                                'upup-bg-[#30C5F7] dark:upup-bg-[#30C5F7]':
                                    dark,
                            },
                            classNames.uploadButton,
                        )}
                        onClick={proceedUpload}
                        disabled={
                            uploadStatus === UploadStatus.ONGOING ||
                            isProcessing
                        }
                    >
                        Upload {files.size} file{files.size > 1 ? 's' : ''}
                    </button>
                </ShouldRender>
                <ShouldRender if={uploadStatus === UploadStatus.SUCCESSFUL}>
                    <button
                        className={cn(
                            'upup-disabled:animate-pulse upup-ml-auto upup-rounded-lg upup-bg-blue-600 upup-px-3 upup-py-2 upup-text-sm upup-font-medium upup-text-white',
                            {
                                'upup-bg-[#30C5F7] dark:upup-bg-[#30C5F7]':
                                    dark,
                            },
                            classNames.uploadDoneButton,
                        )}
                        onClick={handleDone}
                    >
                        Done
                    </button>
                </ShouldRender>
                <ProgressBar
                    className="upup-flex-1"
                    progressBarClassName="upup-rounded"
                    progress={totalProgress}
                    showValue
                />
            </div>
        </div>
    )
})
