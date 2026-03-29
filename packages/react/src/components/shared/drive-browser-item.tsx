'use client'

import { motion, type Transition } from 'framer-motion'
import React from 'react'
import { useUploaderContext } from '../../context/uploader-context'
import { cn } from '../../lib/tailwind'
import type { OneDriveFile, GoogleFile, GoogleRoot } from '../../lib/google-drive-utils'
import DriveBrowserIcon from './drive-browser-icon'

type DriveBrowserItemProps = {
    file: OneDriveFile | GoogleFile
    handleClick:
        | ((file: OneDriveFile) => Promise<void>)
        | ((file: GoogleFile | GoogleRoot) => void)
    selectedFiles: OneDriveFile[] | GoogleFile[]
    index: number
}

export default function DriveBrowserItem({
    file,
    selectedFiles,
    handleClick,
    index,
}: Readonly<DriveBrowserItemProps>) {
    const { dark, classNames } = useUploaderContext()
    const isFolder = Boolean(
        (file as OneDriveFile).isFolder || (file as GoogleFile).children,
    )
    const isFileSelected = (selectedFiles as Array<any>).filter(
        (f) => f.id === file.id,
    ).length

    const transition: Transition = {
        type: 'spring',
        damping: 10,
        stiffness: 100,
        opacity: { delay: index * 0.05 },
        y: { delay: index * 0.05 },
    }

    return (
        <motion.div
            key={file.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0, transition }}
            whileHover={{ opacity: 1, y: 0, transition }}
            exit={{ opacity: 0, y: 10, transition }}
            transition={transition}
            className={cn(
                'upup-hover:bg-[#bab4b499] upup-group upup-mb-1 upup-flex upup-cursor-pointer upup-items-center upup-justify-between upup-gap-2 upup-rounded-md upup-p-1 upup-py-2',
                {
                    'upup-font-medium': isFolder,
                    'upup-bg-[#bab4b499]': isFileSelected,
                    'upup-bg-[#e9ecef00]': !isFileSelected,
                    [(classNames as any)?.driveItemContainerDefault!]:
                        !isFileSelected &&
                        (classNames as any)?.driveItemContainerDefault,
                    [(classNames as any)?.driveItemContainerSelected!]:
                        isFileSelected &&
                        (classNames as any)?.driveItemContainerSelected,
                },
            )}
            onClick={() => handleClick(file as any)}
        >
            <div
                className={cn(
                    'upup-flex upup-items-center upup-gap-2',
                    (classNames as any)?.driveItemContainerInner,
                )}
            >
                <DriveBrowserIcon file={file} />
                <h1
                    className={cn(
                        'upup-text-wrap upup-break-all upup-text-xs',
                        {
                            'upup-text-[#e0e0e0] dark:upup-text-[#e0e0e0]':
                                dark,
                        },
                        (classNames as any)?.driveItemInnerText,
                    )}
                >
                    {file.name}
                </h1>
            </div>
        </motion.div>
    )
}
