import { GoogleFile, Root } from 'google'
import { OneDriveFile } from 'microsoft'
import React from 'react'
import { useUploaderTheme } from '../../context/RootContext'
import { cn } from '../../lib/tailwind'
import DriveBrowserIcon from './DriveBrowserIcon'

type DriveBrowserItemProps = {
    file: OneDriveFile | GoogleFile
    handleClick:
        | ((file: OneDriveFile) => Promise<void>)
        | ((file: GoogleFile | Root) => void)
    selectedFiles: OneDriveFile[] | GoogleFile[]
}

export default function DriveBrowserItem({
    file,
    selectedFiles,
    handleClick,
}: Readonly<DriveBrowserItemProps>) {
    const { isDark: dark, slotOverrides: slotClasses } = useUploaderTheme()
    const isFolder = Boolean(
        (file as OneDriveFile).isFolder || (file as GoogleFile).children,
    )
    const isFileSelected = (selectedFiles as Array<any>).filter(
        f => f.id === file.id,
    ).length

    return (
        <div
            data-upup-slot="drive-browser-item"
            className={cn(
                'upup-hover:bg-[#bab4b499] upup-group upup-mb-1 upup-flex upup-cursor-pointer upup-items-center upup-justify-between upup-gap-2 upup-rounded-md upup-p-1 upup-py-2 upup-transition-colors upup-duration-150',
                {
                    'upup-font-medium': isFolder,
                    'upup-bg-[#bab4b499]': isFileSelected,
                    'upup-bg-[#e9ecef00]': !isFileSelected,
                    [slotClasses.driveItemContainerDefault!]:
                        !isFileSelected &&
                        slotClasses.driveItemContainerDefault,
                    [slotClasses.driveItemContainerSelected!]:
                        isFileSelected &&
                        slotClasses.driveItemContainerSelected,
                },
            )}
            onClick={() => handleClick(file as any)}
        >
            <div
                className={cn(
                    'upup-flex upup-items-center upup-gap-2',
                    slotClasses.driveItemContainerInner,
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
                        slotClasses.driveItemInnerText,
                    )}
                >
                    {file.name}
                </h1>
            </div>
        </div>
    )
}
