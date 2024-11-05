import Box from '@mui/material/Box'
import { FileIcon, LinearProgressBar } from 'components'
import { AnimatePresence, motion } from 'framer-motion'
import { bytesToSize } from 'lib'
import { Dispatch, FC, SetStateAction } from 'react'
import FileViewer from 'react-file-viewer'
import { TbX } from 'react-icons/tb'

type Props = {
    files: File[]
    setFiles: Dispatch<SetStateAction<File[]>>
    isAddingMore: boolean
    setIsAddingMore: (isAddingMore: boolean) => void
    multiple?: boolean
    onFileClick?: (file: File) => void
    progress: number
    limit?: number
}

const Preview: FC<Props> = ({
    files,
    setFiles,
    isAddingMore,
    setIsAddingMore,
    multiple, // handleUpload,
    onFileClick,
    progress,
    limit,
}: Props) => {
    /**
     * Remove file from files array
     */
    const removeFile = (index: number) =>
        setFiles(files => [...files.filter((_, i) => i !== index)])

    return (
        <AnimatePresence>
            {files.length > 0 && (
                <motion.div className="pointer-events-none absolute z-10 grid h-full w-full grid-rows-[auto,1fr,auto] text-sm font-medium">
                    <motion.div
                        initial={{ scaleY: '0%' }}
                        animate={{ scaleY: '100%' }}
                        exit={{ scaleY: '0%' }}
                        className="pointer-events-auto flex origin-top items-center justify-between border-b bg-[#fafafa] p-2 text-[#1b5dab] dark:bg-[#1f1f1f] dark:text-[#fafafa]"
                    >
                        <button
                            className="rounded-md p-2 px-4 transition-all duration-300 hover:bg-[#e9ecef] hover:text-[#1f1f1f] active:bg-[#dfe6f1]"
                            onClick={() => setFiles([])}
                            type="button"
                        >
                            Cancel
                        </button>
                        <p className="text-[#333] dark:text-[#fafafa]">
                            {files.length} file{files.length > 1 ? 's' : ''}{' '}
                            selected
                        </p>

                        <button
                            className={
                                'rounded-md p-2 px-4 transition-all duration-300 hover:bg-[#e9ecef] hover:text-[#1f1f1f] active:bg-[#dfe6f1] ' +
                                (!multiple && 'pointer-events-none opacity-0')
                            }
                            onClick={() => setIsAddingMore(!isAddingMore)}
                            type="button"
                        >
                            {isAddingMore
                                ? 'Show Previews'
                                : !limit || files.length < limit
                                ? 'Add more'
                                : ''}
                        </button>
                    </motion.div>
                    <motion.div
                        initial={{ scaleY: '0%' }}
                        animate={{
                            scaleY: isAddingMore ? '0%' : '100%',
                            opacity: isAddingMore ? 0 : 1,
                            pointerEvents: isAddingMore ? 'none' : 'all',
                        }}
                        exit={{ scaleY: '0%' }}
                        className={
                            'pointer-events-auto grid origin-bottom gap-4 overflow-y-scroll border-b bg-[#f4f4f4] p-4 dark:bg-[#1f1f1f] dark:text-[#fafafa] ' +
                            (multiple
                                ? 'xl-grid-cols-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3'
                                : 'grid-cols-1 grid-rows-1')
                        }
                    >
                        {files.map((file, i) => (
                            <div
                                key={i}
                                className="relative flex h-full w-full flex-col items-start dark:bg-[#1f1f1f] dark:text-[#fafafa]"
                                onClick={() => {
                                    if (onFileClick) onFileClick(file)
                                }}
                            >
                                <div
                                    className={
                                        'w-full rounded-md object-cover shadow ' +
                                        (multiple ? 'h-40' : 'h-[90%]')
                                    }
                                >
                                    <FileViewer
                                        fileType={file.name
                                            .split('.')
                                            .pop()
                                            ?.toLowerCase()}
                                        filePath={URL.createObjectURL(file)}
                                        onError={e => {
                                            console.log(
                                                'error in file-viewer:',
                                                e,
                                            )
                                            // Fallback to FileIcon if preview fails
                                            return <FileIcon name={file.name} />
                                        }}
                                    />
                                </div>
                                <div className="flex w-full items-center justify-between">
                                    <div>
                                        <p className="mt-1 text-xs font-medium">
                                            {file.name}
                                        </p>
                                        <p className="text-[10px] font-medium text-gray-500">
                                            {bytesToSize(file.size)}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    className="absolute -right-1 -top-1 rounded-full bg-black"
                                    onClick={() => removeFile(i)}
                                    type="button"
                                >
                                    <TbX className="h-4 w-4 text-white" />
                                </button>
                            </div>
                        ))}
                    </motion.div>
                    {progress > 0 && (
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
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    )
}

export default Preview
