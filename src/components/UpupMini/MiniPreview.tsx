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
                <motion.div className="h-full w-full grid grid-rows-[1fr,auto] text-sm font-medium absolute z-10">
                    <motion.div
                        initial={{ scaleY: '0%' }}
                        animate={{ scaleY: '100%', opacity: 1 }}
                        exit={{ scaleY: '0%' }}
                        className="grid p-1 border-b bg-[#f4f4f4] dark:bg-[#1f1f1f] dark:text-[#fafafa] origin-bottom gap-4 grid-cols-1 grid-rows-1"
                    >
                        {files.map((file, i) => (
                            <div
                                key={'filePreview#' + i}
                                className="flex flex-col items-start h-full w-full relative dark:bg-[#1f1f1f] dark:text-[#fafafa]"
                            >
                                {file.type.startsWith('image/') ? (
                                    <img
                                        src={URL.createObjectURL(file)}
                                        alt=""
                                        className="w-full rounded-md object-cover shadow h-full absolute"
                                    />
                                ) : (
                                    <div className="w-full rounded-md object-cover shadow text-[#6b7280] h-[90%]">
                                        <FileIcon name={file.name} />
                                    </div>
                                )}

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
                </motion.div>
            )}
        </AnimatePresence>
    )
}

export default MiniPreview
