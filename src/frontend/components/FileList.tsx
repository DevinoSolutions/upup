import { AnimatePresence, motion } from 'framer-motion'
import React, { memo } from 'react'
import { UploadStatus, useRootContext } from '../context/RootContext'
import { cn } from '../lib/tailwind'
import FileItem from './FileItem'
import MainBoxHeader from './shared/MainBoxHeader'
import ProgressBar from './shared/ProgressBar'
import ShouldRender from './shared/ShouldRender'

export default memo(function FileList() {
    const {
        isAddingMore,
        activeAdapter,
        files,
        upload: { proceedUpload, uploadStatus, totalProgress },
        props: { mini, dark, classNames },
        handleDone,
    } = useRootContext()

    return (
        <div
            className={cn('relative flex h-full flex-col rounded-lg shadow', {
                'pt-[72px] md:pt-11': !mini,
                hidden: isAddingMore || activeAdapter || !files.size,
            })}
        >
            <MainBoxHeader handleCancel={handleDone} />

            <AnimatePresence>
                <motion.div
                    className={cn(
                        'preview-scroll flex flex-1 flex-col overflow-y-auto bg-black/[0.075] p-3',
                        { 'bg-white/10 dark:bg-white/10': dark },
                        classNames.fileListContainer,
                    )}
                >
                    <div
                        className={cn(
                            'flex gap-4 max-md:flex-col md:grid md:gap-y-6',
                            {
                                'sm:grid-cols-3': files.size > 1,
                                'flex-1': files.size === 1,
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
            </AnimatePresence>
            <div
                className={cn(
                    'flex items-center gap-3 rounded-b-lg bg-black/[0.025] px-3 py-2',
                    {
                        'bg-white/5 dark:bg-white/5': dark,
                    },
                    classNames.fileListFooter,
                )}
            >
                <ShouldRender if={uploadStatus !== UploadStatus.SUCCESSFUL}>
                    <button
                        className={cn(
                            'ml-auto rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:animate-pulse',
                            {
                                'bg-[#30C5F7] dark:bg-[#30C5F7]': dark,
                            },
                            classNames.uploadButton,
                        )}
                        onClick={proceedUpload}
                        disabled={uploadStatus === UploadStatus.ONGOING}
                    >
                        Upload {files.size} file{files.size > 1 ? 's' : ''}
                    </button>
                </ShouldRender>
                <ShouldRender if={uploadStatus === UploadStatus.SUCCESSFUL}>
                    <button
                        className={cn(
                            'ml-auto rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:animate-pulse',
                            {
                                'bg-[#30C5F7] dark:bg-[#30C5F7]': dark,
                            },
                            classNames.uploadDoneButton,
                        )}
                        onClick={handleDone}
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
