import React from 'react'
import { type DriveFile } from '@upupjs/core'
import { cn } from '@upupjs/core/internal'
import { useUploaderTheme } from '../../context/UploaderContext'
import DriveBrowserIcon from './DriveBrowserIcon'

type DriveBrowserItemProps = {
    file: DriveFile
    handleClick: (file: DriveFile) => void | Promise<void>
    selectedFiles: DriveFile[]
}

export default function DriveBrowserItem({
    file,
    selectedFiles,
    handleClick,
}: Readonly<DriveBrowserItemProps>): React.ReactElement | null {
    const { isDark: dark, slotOverrides: slotClasses } = useUploaderTheme()
    const isFolder = file.isFolder
    const isFileSelected = selectedFiles.filter(f => f.id === file.id).length

    return (
        <div
            data-upup-slot="drive-browser-item"
            className={cn(
                // Panel-chrome row (states-tour-3 .st3-prow): translucent card +
                // hairline ring, sky-tinted selection, subtle lift on hover.
                'upup-fx-hover-lift upup-group upup-mb-1.5 upup-flex upup-cursor-pointer upup-items-center upup-justify-between upup-gap-2 upup-rounded-[11px] upup-px-3 upup-py-2.5 upup-ring-1',
                {
                    'upup-font-medium': isFolder,
                },
                isFileSelected
                    ? dark
                        ? 'upup-bg-[#0ea5e9]/10 upup-ring-[#38bdf8]/35'
                        : 'upup-bg-[#0ea5e9]/10 upup-ring-[#0ea5e9]/40'
                    : dark
                      ? 'upup-bg-white/[0.04] upup-ring-white/[0.06] hover:upup-bg-white/[0.07]'
                      : 'upup-bg-white upup-ring-black/[0.07] hover:upup-bg-slate-50',
                {
                    [slotClasses.driveItemContainerDefault ?? '']:
                        !isFileSelected &&
                        slotClasses.driveItemContainerDefault,
                    [slotClasses.driveItemContainerSelected ?? '']:
                        isFileSelected &&
                        slotClasses.driveItemContainerSelected,
                },
            )}
            onClick={() => {
                void handleClick(file)
            }}
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
