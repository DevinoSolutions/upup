import { motion, Target } from 'framer-motion'
import { TransitionDefinition } from 'google'
import { OneDriveFile } from 'microsoft'
import { TbFileUnknown, TbFolder } from 'react-icons/tb'

const backgroundColors = {
    default: '#e9ecef00',
    selected: '#bab4b499',
    hover: '#3a3a3a',
}
type Props = {
    file: OneDriveFile
    handleClick: (file: OneDriveFile) => void
    index: number
    selectedFiles: OneDriveFile[]
    accept?: string
}

const ListItem = ({
    file,
    handleClick,
    index,
    selectedFiles,
    accept,
}: Props) => {
    console.log('inside ListItem.tsx', file)
    const isFolder = file.children!.length
    const isFileSelected = selectedFiles.includes(file)
    const isFileAccepted =
        accept && accept !== '*' && accept.includes(file.name.split('.').pop()!)

    if (accept && !isFolder && !isFileAccepted) return null

    const icon = isFolder ? (
        <TbFolder />
    ) : file.thumbnails ? (
        // change this shit please xD
        <img
            width={file.thumbnails.small.width}
            height={file.thumbnails.small.height}
            src={file.thumbnails.small.url}
            alt={file.name}
        />
    ) : (
        <TbFileUnknown />
    )

    const backgroundColor = {
        ...(isFileSelected && { backgroundColor: backgroundColors.selected }),
        ...(!isFileSelected && { backgroundColor: backgroundColors.default }),
    }
    const initial: Target = {
        opacity: 0,
        y: 10,
        ...backgroundColor,
    }

    const animate: Target = {
        opacity: 1,
        y: 0,
        ...backgroundColor,
    }

    const exit: Target = { opacity: 0, y: 10 }

    const transition: TransitionDefinition = {
        duration: 0.2,
        delay: index * 0.05,
        backgroundColor: { duration: 0.2, delay: 0 },
    }

    return (
        <motion.div
            key={file.id}
            initial={initial}
            animate={animate}
            exit={exit}
            transition={transition}
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
