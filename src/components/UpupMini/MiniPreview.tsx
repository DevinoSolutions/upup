import { AnimatePresence, motion } from 'framer-motion'
import { Dispatch, FC, SetStateAction } from 'react'
import PreviewComponent from './PreviewComponent'

type Props = {
    files: File[]
    setFiles: Dispatch<SetStateAction<File[]>>
}

const MiniPreview: FC<Props> = ({ files, setFiles }: Props) => {
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
                                key={`${file.name}-${i}`} // More specific key
                                setFiles={setFiles}
                                file={file}
                                index={i}
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
