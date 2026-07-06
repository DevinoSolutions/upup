import { html } from 'lit-html'
import { cn } from '@upup/core/internal'
import type { DriveFile, DriveFolder } from '@upup/core'
import type { UploaderContext } from '../../lib/types'
import { driveBrowserIcon } from './drive-browser-icon'

export function driveBrowserItem(
    ctx: UploaderContext,
    args: {
        item: DriveFile | DriveFolder
        isSelected: boolean
        isClickLoading: boolean
        onClick: () => void
    },
) {
    const { item, isSelected, onClick } = args
    const file = item
    const isDark = ctx.theme.getSnapshot().isDark
    const slot = ctx.theme.getSnapshot().slotOverrides
    const isFolder = !!file.isFolder

    return html` <div
        data-upup-slot="drive-browser-item"
        class=${cn(
            'upup-hover:bg-[#bab4b499] upup-group upup-mb-1 upup-flex upup-cursor-pointer upup-items-center upup-justify-between upup-gap-2 upup-rounded-md upup-p-1 upup-py-2 upup-transition-colors upup-duration-150',
            {
                'upup-font-medium': isFolder,
                'upup-bg-[#bab4b499]': isSelected,
                'upup-bg-[#e9ecef00]': !isSelected,
                [slot.driveItemContainerDefault!]:
                    !isSelected && !!slot.driveItemContainerDefault,
                [slot.driveItemContainerSelected!]:
                    isSelected && !!slot.driveItemContainerSelected,
            },
        )}
        @click=${onClick}
    >
        <div
            class=${cn(
                'upup-flex upup-items-center upup-gap-2',
                slot.driveItemContainerInner,
            )}
        >
            ${driveBrowserIcon(ctx, { isFolder, file })}
            <h1
                class=${cn(
                    'upup-text-wrap upup-break-all upup-text-xs',
                    {
                        'upup-text-[#e0e0e0] dark:upup-text-[#e0e0e0]': isDark,
                    },
                    slot.driveItemInnerText,
                )}
            >
                ${file.name}
            </h1>
        </div>
    </div>`
}
