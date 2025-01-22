import { AnimationProps, motion } from 'framer-motion'
import { GoogleFile, Root } from 'google'
import { OneDriveFile } from 'microsoft'
import React from 'react'
import DriveBrowserIcon from './DriveBrowserIcon'

type DriveBrowserItemProps = {
    file: OneDriveFile | GoogleFile
    handleClick:
        | ((file: OneDriveFile) => Promise<void>)
        | ((file: GoogleFile | Root) => void)
    selectedFiles: OneDriveFile[] | GoogleFile[]
    index: number
}

const backgroundColors = {
    default: '#e9ecef00',
    selected: '#bab4b499',
    hover: '#eaeaea',
}

export default function DriveBrowserItem({
    file,
    selectedFiles,
    handleClick,
    index,
}: DriveBrowserItemProps) {
    const isFolder = Boolean(
        (file as OneDriveFile).isFolder || (file as GoogleFile).children,
    )
    const isFileSelected = (selectedFiles as Array<any>).filter(
        f => f.id === file.id,
    ).length

    const backgroundColor = isFileSelected
        ? backgroundColors.selected
        : backgroundColors.default

    const backgroundColorHover = isFileSelected
        ? backgroundColors.selected
        : backgroundColors.hover

    const transition: AnimationProps['transition'] = {
        type: 'spring',
        damping: 10,
        stiffness: 100,
        opacity: { delay: index * 0.05 },
        y: { delay: index * 0.05 },
    }

    return (
        <motion.div
            key={file.id}
            initial={{
                opacity: 0,
                y: 10,
                backgroundColor,
            }}
            animate={{
                opacity: 1,
                y: 0,
                backgroundColor,
                transition,
            }}
            whileHover={{
                opacity: 1,
                y: 0,
                backgroundColor: backgroundColorHover,
                transition,
            }}
            exit={{ opacity: 0, y: 10, transition }}
            transition={transition}
            className={`mb-1 flex cursor-pointer items-center justify-between gap-2 rounded-md p-1 py-2 ${
                isFolder ? 'font-medium' : ''
            }`}
            onClick={() => handleClick(file as any)}
        >
            <div className="flex items-center gap-2">
                <i className="text-lg">
                    <DriveBrowserIcon file={file} />
                </i>
                <h1 className="text-xs">{file.name}</h1>
            </div>
        </motion.div>
    )
}
