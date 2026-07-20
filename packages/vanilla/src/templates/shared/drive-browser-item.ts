import { html, type TemplateResult } from 'lit-html'
import { cn } from '@upupjs/core/internal'
import type { DriveFile, DriveFolder } from '@upupjs/core'
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
): TemplateResult {
    const { item, isSelected, onClick } = args
    const file = item
    const isDark = ctx.theme.getSnapshot().isDark
    const slot = ctx.theme.getSnapshot().slotOverrides
    const isFolder = file.isFolder

    return html` <div
        data-upup-slot="drive-browser-item"
        class=${cn(
            // Panel-chrome row (states-tour-3 .st3-prow): translucent card +
            // hairline ring, sky-tinted selection, subtle lift on hover.
            'upup-fx-hover-lift upup-group upup-mb-1.5 upup-flex upup-cursor-pointer upup-items-center upup-justify-between upup-gap-2 upup-rounded-[11px] upup-px-3 upup-py-2.5 upup-ring-1',
            {
                'upup-font-medium': isFolder,
            },
            isSelected
                ? isDark
                    ? 'upup-bg-[#0ea5e9]/10 upup-ring-[#38bdf8]/35'
                    : 'upup-bg-[#0ea5e9]/10 upup-ring-[#0ea5e9]/40'
                : isDark
                  ? 'upup-bg-white/[0.04] upup-ring-white/[0.06] hover:upup-bg-white/[0.07]'
                  : 'upup-bg-white upup-ring-black/[0.07] hover:upup-bg-slate-50',
            {
                [slot.driveItemContainerDefault ?? '']:
                    !isSelected && !!slot.driveItemContainerDefault,
                [slot.driveItemContainerSelected ?? '']:
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
