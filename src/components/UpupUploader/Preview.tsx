import { Dispatch, FC, SetStateAction } from 'react'
import { bytesToSize } from 'lib'
import { GoogleFile } from 'google'
import { default as FileIcon } from 'components/FileIcon'
import { default as LinearProgressBar } from 'components/LinearProgressBar'
import { AnimatePresence, motion } from 'framer-motion'
import { TbX } from 'react-icons/tb'
import Box from '@mui/material/Box'

type Props = {
    files: File[]
    setFiles: Dispatch<SetStateAction<File[]>>
    isAddingMore: boolean
    setIsAddingMore: (isAddingMore: boolean) => void
    multiple?: boolean
    onFileClick?: (file: File) => void
    progress: number
}

const Preview: FC<Props> = ({
    files,
    setFiles,
    isAddingMore,
    setIsAddingMore,
    multiple, // handleUpload,
    onFileClick,
    progress,
}: Props) => {
    /**
     * Remove file from files array
     */
    const removeFile = (index: number) =>
        setFiles(files => [...files.filter((_, i) => i !== index)])

    return (
        <AnimatePresence>
            {files.length > 0 && (
                <motion.div className="h-full w-full grid grid-rows-[auto,1fr,auto] text-sm font-medium absolute z-10 pointer-events-none">
                    <motion.div
                        initial={{ scaleY: '0%' }}
                        animate={{ scaleY: '100%' }}
                        exit={{ scaleY: '0%' }}
                        className="flex justify-between items-center p-2 border-b bg-[#fafafa] text-[#1b5dab] dark:bg-[#1f1f1f] dark:text-[#fafafa] origin-top pointer-events-auto"
                    >
                        <button
                            className="hover:bg-[#e9ecef] hover:text-[#1f1f1f] active:bg-[#dfe6f1] rounded-md p-2 px-4 transition-all duration-300"
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
                                'hover:bg-[#e9ecef] hover:text-[#1f1f1f] active:bg-[#dfe6f1] rounded-md p-2 px-4 transition-all duration-300 ' +
                                (!multiple && 'opacity-0 pointer-events-none')
                            }
                            onClick={() => setIsAddingMore(!isAddingMore)}
                            type="button"
                        >
                            {isAddingMore ? 'Show Previews' : 'Add more'}
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
                            'grid p-4 border-b bg-[#f4f4f4] dark:bg-[#1f1f1f] dark:text-[#fafafa] origin-bottom gap-4 overflow-y-scroll pointer-events-auto ' +
                            (multiple
                                ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl-grid-cols-4'
                                : 'grid-cols-1 grid-rows-1')
                        }
                    >
                        {files.map((file, i) => (
                            <div
                                key={i}
                                className="flex flex-col items-start h-full w-full relative dark:bg-[#1f1f1f] dark:text-[#fafafa]"
                                onClick={() => {
                                    if (onFileClick) onFileClick(file)
                                }}
                            >
                                {(file as unknown as GoogleFile)
                                    .thumbnailLink ||
                                file.type.startsWith('image/') ? (
                                    <img
                                        src={
                                            (file as unknown as GoogleFile)
                                                .thumbnailLink ||
                                            URL.createObjectURL(file)
                                        }
                                        alt=""
                                        className={
                                            'w-full rounded-md object-cover shadow ' +
                                            (multiple ? 'h-40' : ' h-full')
                                        }
                                    />
                                ) : (
                                    <div
                                        className={
                                            'w-full rounded-md object-cover shadow text-[#6b7280] ' +
                                            (multiple ? 'h-40' : 'h-[90%]')
                                        }
                                    >
                                        <FileIcon name={file.name} />
                                    </div>
                                )}
                                <div className="flex items-center justify-between w-full">
                                    <div>
                                        <p className="font-medium text-xs mt-1">
                                            {file.name}
                                        </p>
                                        <p className="font-medium text-[10px] text-gray-500">
                                            {bytesToSize(file.size)}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    className="bg-black rounded-full absolute -top-1 -right-1"
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
                            className="flex justify-start items-center p-3 border-b bg-[#fafafa] text-white origin-bottom pointer-events-auto"
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
