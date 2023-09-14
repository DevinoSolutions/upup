import { motion } from 'framer-motion'
import { TbFileUnknown, TbFolder } from 'react-icons/tb'
import { GoogleFile } from 'google'

type Props = {
    file: GoogleFile
    handleClick: (file: GoogleFile) => void
    index: number
    selectedFiles: GoogleFile[]
}

const ListItem = ({ file, handleClick, index, selectedFiles }: Props) => {
    const isFolder = !!file.children
    const isFileSelected = selectedFiles.includes(file)

    const backgroundColors = {
        default: '#e9ecef00',
        selected: '#e9ecef99',
        hover: '#e9ecef',
        tap: '#dfe6f1',
    }

    if (isFolder && !file.children?.length) return null
    if (!isFolder && !file.thumbnailLink) return null

    const icon = isFolder ? (
        <TbFolder />
    ) : file.thumbnailLink ? (
        <img
            src={file.thumbnailLink}
            alt={file.name}
            className="w-5 h-5 rounded-md"
        />
    ) : (
        <TbFileUnknown />
    )

    return (
        <motion.div
            key={file.id}
            initial={{
                opacity: 0,
                y: -10,
                backgroundColor: isFileSelected
                    ? backgroundColors.selected
                    : backgroundColors.default,
            }}
            animate={{
                opacity: 1,
                y: 0,
                backgroundColor: isFileSelected
                    ? backgroundColors.selected
                    : backgroundColors.default,
            }}
            whileHover={{ backgroundColor: backgroundColors.hover }}
            whileTap={{ backgroundColor: backgroundColors.tap }}
            exit={{ opacity: 0, y: 10 }}
            transition={{
                duration: 0.2,
                delay: index * 0.05,
                backgroundColor: { duration: 0.2, delay: 0 },
            }}
            className={`flex items-center justify-between gap-2 mb-1 cursor-pointer rounded-md py-2 p-1 ${
                isFolder ? 'font-medium' : ''
            }`}
            onClick={() => handleClick(file)}
        >
            <div className="flex items-center gap-2">
                <i className="text-lg">{icon}</i>
                <h1 className="text-xs">{file.name}</h1>
            </div>
        </motion.div>
    )
}

export default ListItem
