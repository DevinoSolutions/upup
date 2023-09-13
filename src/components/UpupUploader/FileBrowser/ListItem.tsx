import { motion } from 'framer-motion'
import { TbFileUnknown, TbFolder } from 'react-icons/tb'

export default function ListItem({
    file,
    handleClick,
    i,
    selectedFiles,
}: {
    file: any
    handleClick: (file: any) => void
    i: number
    selectedFiles: any[]
}) {
    const isFolder = !!file.children
    const isFileSelected: boolean = selectedFiles.includes(file)

    return (
        <motion.div
            key={file.id}
            initial={{
                opacity: 0,
                y: -10,
                backgroundColor: isFileSelected ? '#e9ecef99' : '#e9ecef00',
            }}
            animate={{
                opacity: 1,
                y: 0,
                backgroundColor: isFileSelected ? '#e9ecef99' : '#e9ecef00',
            }}
            whileHover={{
                backgroundColor: '#e9ecef',
            }}
            whileTap={{
                backgroundColor: '#dfe6f1',
            }}
            exit={{ opacity: 0, y: 10 }}
            transition={{
                duration: 0.2,
                delay: i * 0.05,
                backgroundColor: {
                    duration: 0.2,
                    delay: 0,
                },
            }}
            className={
                'flex items-center justify-between gap-2 mb-1 cursor-pointer rounded-md py-2 p-1 ' +
                (isFolder ? ' font-medium' : '')
            }
            onClick={() => handleClick(file)}
        >
            <div className="flex items-center gap-2">
                <i className="text-lg">
                    {isFolder ? (
                        <TbFolder />
                    ) : // check if file has image
                    file.thumbnailLink ? (
                        <img
                            src={file.thumbnailLink}
                            alt={file.name}
                            className="w-5 h-5 rounded-md"
                        />
                    ) : (
                        <TbFileUnknown />
                    )}
                </i>
                <h1 className="text-xs">{file.name}</h1>
            </div>
        </motion.div>
    )
}
