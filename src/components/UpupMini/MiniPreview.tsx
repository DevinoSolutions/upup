import { AnimatePresence, motion } from 'framer-motion'
import { FC } from 'react'
import { TbX } from 'react-icons/tb'
import FileIcon from '../FileIcon'

type Props = {
    files: File[]
    setFiles: (files: File[]) => void
}

const MiniPreview: FC<Props> = ({ files, setFiles }: Props) => {
    /**
     * Remove file from files array
     */
    const removeFile = (index: number) =>
        setFiles([...files.filter((_, i) => i !== index)])

    return (
        <AnimatePresence>
            {files.length > 0 && (
                <motion.div className="absolute z-10 grid h-full w-full grid-rows-[1fr,auto] text-sm font-medium">
                    <motion.div
                        initial={{ scaleY: '0%' }}
                        animate={{ scaleY: '100%', opacity: 1 }}
                        exit={{ scaleY: '0%' }}
                        className="grid origin-bottom grid-cols-1 grid-rows-1 gap-4 border-b bg-[#f4f4f4] p-1 dark:bg-[#1f1f1f] dark:text-[#fafafa]"
                    >
                        {files.map((file, i) => (
                            <div
                                key={'filePreview#' + i}
                                className="relative flex h-full w-full flex-col items-start dark:bg-[#1f1f1f] dark:text-[#fafafa]"
                            >
                                {file.type.startsWith('image/') ? (
                                    <img
                                        src={URL.createObjectURL(file)}
                                        alt=""
                                        className="absolute h-full w-full rounded-md object-cover shadow"
                                    />
                                ) : (
                                    <div className="h-[90%] w-full rounded-md object-cover text-[#6b7280] shadow">
                                        <FileIcon name={file.name} />
                                    </div>
                                )}

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
                </motion.div>
            )}
        </AnimatePresence>
    )
}

export default MiniPreview
