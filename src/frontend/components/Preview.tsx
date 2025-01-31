import Box from '@mui/material/Box'
import { AnimatePresence, motion } from 'framer-motion'
import React, { forwardRef, memo } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { UpupUploaderRef } from '../../shared/types'
import { useRootContext } from '../context/RootContext'
import useUpload from '../hooks/useUpload'
import LinearProgressBar from './LinearProgressBar'
import PreviewComponent from './PreviewComponent'
import ShouldRender from './shared/ShouldRender'

const getDivClassName = (mini: boolean, multiple: boolean) => {
    let className =
        'grid origin-bottom gap-4 border-b bg-[#f4f4f4] dark:bg-[#1f1f1f] dark:text-[#fafafa] '
    if (mini) className += 'grid-cols-1 grid-rows-1 p-1 '
    else {
        if (multiple)
            className +=
                'xl-grid-cols-4 pointer-events-auto grid-cols-1 overflow-y-scroll p-4 sm:grid-cols-2 md:grid-cols-3 '
        else
            className +=
                'pointer-events-auto grid-cols-1 grid-rows-1 overflow-y-scroll p-4'
    }

    return className
}

export default memo(
    forwardRef<UpupUploaderRef>(function Preview(_props, ref) {
        const {
            files,
            setFiles,
            isAddingMore,
            setIsAddingMore,
            props: { multiple, onFileClick, limit, onCancelUpload, mini },
        } = useRootContext()
        const handleCancel = () => {
            if (files.length > 0) {
                onCancelUpload(files)
                setFiles([], true)
            }
        }
        const { progress } = useUpload(ref)
        const canAddMore = files.length && files.length < limit

        return (
            <ShouldRender if={!!files.length}>
                <AnimatePresence>
                    <motion.div
                        className={`absolute z-10 grid h-full w-full text-sm font-medium ${
                            mini
                                ? 'grid-rows-[1fr,auto]'
                                : 'pointer-events-none grid-rows-[auto,1fr,auto]'
                        }`}
                    >
                        <ShouldRender if={!mini}>
                            <motion.div
                                initial={{ scaleY: '0%' }}
                                animate={{ scaleY: '100%' }}
                                exit={{ scaleY: '0%' }}
                                className="pointer-events-auto flex origin-top items-center justify-between border-b bg-[#fafafa] p-2 text-[#1b5dab] dark:bg-[#1f1f1f] dark:text-[#fafafa]"
                            >
                                <button
                                    className="rounded-md p-2 px-4 transition-all duration-300 hover:bg-[#e9ecef] hover:text-[#1f1f1f] active:bg-[#dfe6f1]"
                                    onClick={handleCancel}
                                    type="button"
                                >
                                    Cancel
                                </button>
                                <p className="text-[#333] dark:text-[#fafafa]">
                                    {files.length} file
                                    {files.length > 1 ? 's' : ''} selected
                                </p>

                                <button
                                    className={
                                        'rounded-md p-2 px-4 transition-all duration-300 hover:bg-[#e9ecef] hover:text-[#1f1f1f] active:bg-[#dfe6f1] ' +
                                        (!multiple &&
                                            'pointer-events-none opacity-0')
                                    }
                                    onClick={() =>
                                        setIsAddingMore(prev => !prev)
                                    }
                                    type="button"
                                >
                                    <ShouldRender
                                        if={!!canAddMore && !isAddingMore}
                                    >
                                        Add More
                                    </ShouldRender>
                                    <ShouldRender if={isAddingMore}>
                                        Show Previews
                                    </ShouldRender>
                                </button>
                            </motion.div>
                        </ShouldRender>
                        <motion.div
                            initial={{ scaleY: '0%' }}
                            animate={{
                                scaleY: isAddingMore ? '0%' : '100%',
                                opacity: isAddingMore ? 0 : 1,
                                pointerEvents: isAddingMore ? 'none' : 'all',
                            }}
                            exit={{ scaleY: '0%' }}
                            className={getDivClassName(mini, multiple)}
                        >
                            {files.map(file => (
                                <PreviewComponent
                                    key={uuidv4()}
                                    file={file}
                                    index={files.indexOf(file)}
                                    onClick={() => !mini && onFileClick?.(file)}
                                />
                            ))}
                        </motion.div>
                        <ShouldRender if={!mini && !!progress}>
                            <motion.div
                                initial={{ scaleY: '0%' }}
                                animate={{ scaleY: '100%' }}
                                exit={{ scaleY: '0%' }}
                                className="pointer-events-auto flex origin-bottom items-center justify-start border-b bg-white p-3 text-white dark:bg-[#1f1f1f] dark:text-white"
                            >
                                <Box sx={{ width: '100%' }}>
                                    <LinearProgressBar value={progress} />
                                </Box>
                            </motion.div>
                        </ShouldRender>
                    </motion.div>
                </AnimatePresence>
            </ShouldRender>
        )
    }),
)
