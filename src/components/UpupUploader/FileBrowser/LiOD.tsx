import { AnimationProps, HoverHandlers, motion } from 'framer-motion'
import { handleImgError } from 'lib/handleImgError'
import { OneDriveFile } from 'microsoft'
import { TbFile, TbFolder } from 'react-icons/tb'

const backgroundColors = {
    default: '#e9ecef00',
    selected: '#bab4b499',
    hover: '#eaeaea',
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
    const isFolder = file.children!.length
    const isFileSelected = selectedFiles.includes(file)
    const isFileAccepted =
        accept && accept !== '*' && accept.includes(file.name.split('.').pop()!)

    if (accept && !isFolder && !isFileAccepted) return null

    const icon = isFolder ? (
        <TbFolder />
    ) : file.thumbnails ? (
        <img
            src={file.thumbnails.small.url}
            alt={file.name}
            className="w-5 h-5 rounded-md border"
            onError={handleImgError}
        />
    ) : (
        <TbFile />
    )

    const backgroundColor = {
        ...(isFileSelected && { backgroundColor: backgroundColors.selected }),
        ...(!isFileSelected && { backgroundColor: backgroundColors.default }),
    }

    const transition: AnimationProps['transition'] = {
        type: 'spring',
        damping: 10,
        stiffness: 100,
        opacity: { delay: index * 0.05 },
        y: { delay: index * 0.05 },
    }

    const initial: AnimationProps['initial'] = {
        opacity: 0,
        y: 10,
        ...backgroundColor,
    }

    const animate: AnimationProps['animate'] = {
        opacity: 1,
        y: 0,
        ...backgroundColor,
        transition,
    }

    const backgroundColorHover = {
        ...(isFileSelected && {
            backgroundColor: backgroundColors.selected,
        }),
        ...(!isFileSelected && {
            backgroundColor: backgroundColors.hover,
        }),
    }

    const hover: HoverHandlers['whileHover'] = {
        opacity: 1,
        y: 0,
        ...backgroundColorHover,
        transition,
    }

    const exit: AnimationProps['exit'] = { opacity: 0, y: 10, transition }

    return (
        <motion.div
            key={file.id}
            initial={initial}
            animate={animate}
            whileHover={hover}
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
