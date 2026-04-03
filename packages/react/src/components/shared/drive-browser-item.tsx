'use client'

import { motion, type Transition } from 'framer-motion'
import React from 'react'
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
                'upup-group upup-mb-1 upup-flex upup-cursor-pointer upup-items-center upup-justify-between upup-gap-2 upup-rounded-md upup-p-1 upup-py-2 upup-transition-colors',
                {
                    'upup-font-medium': isFolder,
                },
            )}
            style={{
                backgroundColor: isFileSelected
                    ? 'var(--upup-color-drag-bg)'
                    : 'transparent',
            }}
            onClick={() => handleClick(file as any)}
            data-upup-slot={isFileSelected ? 'driveBrowser.itemSelected' : 'driveBrowser.itemDefault'}
        >
            <div className="upup-flex upup-items-center upup-gap-2">
                <DriveBrowserIcon file={file} />
                <h1
                    className="upup-text-wrap upup-break-all upup-text-xs"
                    style={{ color: 'var(--upup-color-text)' }}
                    data-upup-slot="driveBrowser.itemInnerText"
                >
                    {file.name}
                </h1>
            </div>
        </motion.div>
    )
}
