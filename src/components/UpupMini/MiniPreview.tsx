import { AnimatePresence, motion } from 'framer-motion'
import { FC } from 'react'
import { FileHandlerProps } from 'types/file'
import PreviewComponent from '../UpupUploader/PreviewComponent'

const MiniPreview: FC<
    FileHandlerProps & { handleFileRemove: (file: File) => void }
> = ({ files, setFiles, handleFileRemove }) => {
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
                            <PreviewComponent
                                key={`${file.id || file.name}-${i}`}
                                setFiles={setFiles}
                                file={file}
                                index={files.indexOf(file)}
                                handleFileRemove={handleFileRemove}
                                mini
                            />
                        ))}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

export default MiniPreview
