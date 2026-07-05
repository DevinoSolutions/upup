import { html, nothing } from 'lit-html'
import { formatUiMessage as t, pluralUiMessage as plural } from '@upup/core'
import { isUploadActive, cn } from '@upup/core/internal'
import type { UploaderContext } from '../../lib/types'
import { icon } from '../icon'

export function uploaderHeader(ctx: UploaderContext, handleCancel: () => void) {
    const mini = ctx.props.mini
    if (mini) return nothing

    const { viewMode, isAddingMore, uploadStatus } =
        ctx.orchestrator.getSnapshot()
    const { isDark, slotOverrides: slotClasses } = ctx.theme.getSnapshot()
    const tr = ctx.translations
    const { limit, isProcessing } = ctx.props
    const size = ctx.core.files.size

    const isUploading = isUploadActive(uploadStatus)
    const isLimitReached = limit === size
    const cancelText = isAddingMore ? tr.cancel : tr.removeAllFiles

    function toggleViewMode() {
        ctx.setViewMode(viewMode === 'grid' ? 'list' : 'grid')
    }

    return html` <div
        data-testid="upup-header"
        data-upup-slot="header"
        class=${cn(
            'upup-shadow-bottom upup-left-0 upup-right-0 upup-top-0 upup-z-10 upup-grid upup-grid-cols-4 upup-grid-rows-2 upup-items-center upup-justify-between upup-rounded-t-lg upup-bg-black/[0.025] upup-px-3 upup-py-2 md:upup-grid-rows-1',
            { 'upup-bg-white/5 dark:upup-bg-white/5': isDark },
            slotClasses.containerHeader,
        )}
    >
        <button
            class=${cn(
                'upup-max-md upup-col-start-1 upup-col-end-3 upup-row-start-2 upup-p-1 upup-text-left upup-text-sm upup-text-blue-600 md:upup-col-end-2 md:upup-row-start-1',
                { 'upup-text-[#30C5F7] dark:upup-text-[#30C5F7]': isDark },
                slotClasses.containerCancelButton,
            )}
            @click=${handleCancel}
            ?disabled=${isUploading || isProcessing}
        >
            ${cancelText}
        </button>
        <span
            class=${cn(
                'upup-col-span-4 upup-text-center upup-text-sm upup-text-[#6D6D6D] md:upup-col-span-2',
                { 'upup-text-gray-300 dark:upup-text-gray-300': isDark },
            )}
        >
            ${isAddingMore
                ? tr.addingMoreFiles
                : t(plural(tr, 'filesSelected', size), { count: size })}
        </span>
        <div
            class="upup-col-start-3 upup-col-end-5 upup-flex upup-items-center upup-justify-end upup-gap-2 md:upup-col-start-4"
        >
            ${size > 1
                ? html` <button
                      class=${cn(
                          'upup-flex upup-h-7 upup-w-7 upup-items-center upup-justify-center upup-rounded upup-text-gray-500 upup-transition-colors hover:upup-bg-black/10',
                          {
                              'upup-text-gray-300 hover:upup-bg-white/10':
                                  isDark,
                          },
                      )}
                      @click=${toggleViewMode}
                      title=${viewMode === 'grid'
                          ? tr.switchToListView
                          : tr.switchToGridView}
                  >
                      ${viewMode === 'grid'
                          ? icon('layout-list', { size: 16 })
                          : icon('layout-grid', { size: 16 })}
                  </button>`
                : nothing}
            ${!isAddingMore && limit > 1 && !isLimitReached
                ? html` <button
                      class=${cn(
                          'upup-flex upup-items-center upup-gap-1 upup-rounded-md upup-border upup-border-dashed upup-border-blue-400/50 upup-px-2 upup-py-1 upup-text-sm upup-text-blue-600',
                          {
                              'upup-text-[#30C5F7] dark:upup-text-[#30C5F7]':
                                  isDark,
                          },
                          slotClasses.containerAddMoreButton,
                      )}
                      @click=${() => ctx.setIsAddingMore(true)}
                      ?disabled=${isUploading || isProcessing}
                  >
                      ${nothing} ${tr.addMore}
                  </button>`
                : nothing}
        </div>
    </div>`
}
