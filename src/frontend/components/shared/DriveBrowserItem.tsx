import { AnimationProps, motion } from 'framer-motion'
import { GoogleFile, Root } from 'google'
import { OneDriveFile } from 'microsoft'
import React from 'react'
import { useRootContext } from '../../context/RootContext'
import { cn } from '../../lib/tailwind'
import DriveBrowserIcon from './DriveBrowserIcon'

type DriveBrowserItemProps = {
    file: OneDriveFile | GoogleFile
    handleClick:
        | ((file: OneDriveFile) => Promise<void>)
        | ((file: GoogleFile | Root) => void)
    selectedFiles: OneDriveFile[] | GoogleFile[]
    index: number
}

export default function DriveBrowserItem({
    file,
    selectedFiles,
    handleClick,
    index,
}: DriveBrowserItemProps) {
    const {
        props: { dark, classNames },
    } = useRootContext()
    const isFolder = Boolean(
        (file as OneDriveFile).isFolder || (file as GoogleFile).children,
    )
    const isFileSelected = (selectedFiles as Array<any>).filter(
        f => f.id === file.id,
    ).length

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
            }}
            animate={{
                opacity: 1,
                y: 0,
                transition,
            }}
            whileHover={{
                opacity: 1,
                y: 0,
                transition,
            }}
            exit={{ opacity: 0, y: 10, transition }}
            transition={transition}
            className={cn(
                'mb-1 flex cursor-pointer items-center justify-between gap-2 rounded-md p-1 py-2 hover:bg-[#bab4b499]',
                {
                    'font-medium': isFolder,
                    'bg-[#bab4b499]': isFileSelected,
                    'bg-[#e9ecef00]': !isFileSelected,
                    [classNames.driveItemContainerDefault!]:
                        !isFileSelected && classNames.driveItemContainerDefault,
                    [classNames.driveItemContainerSelected!]:
                        isFileSelected && classNames.driveItemContainerSelected,
                },
            )}
            onClick={() => handleClick(file as any)}
        >
            <div
                className={cn(
                    'flex items-center gap-2',
                    classNames.driveItemContainerInner,
                )}
            >
                <DriveBrowserIcon file={file} />
                <h1
                    className={cn(
                        'text-wrap break-all text-xs hover:text-[#e0e0e0]',
                        {
                            'text-[#6D6D6D] dark:text-[#6D6D6D]':
                                dark && !isFileSelected,
                            'text-[#e0e0e0] dark:text-[#e0e0e0]':
                                dark && isFileSelected,
                        },
                        classNames.driveItemInnerText,
                    )}
                >
                    {file.name}
                </h1>
            </div>
        </motion.div>
    )
}
