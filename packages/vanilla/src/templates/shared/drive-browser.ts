import { html, nothing } from 'lit-html'
import { repeat } from 'lit-html/directives/repeat.js'
import { formatUiMessage as t, pluralUiMessage as plural } from '@upup/core'
import { cn, searchDriveFiles } from '@upup/core/internal'
import type {
    DriveBrowserError,
    DriveFile,
    DriveFolder,
    DriveUser,
} from '@upup/core'
import type { UploaderContext } from '../../lib/types'
import { sourceViewContainer } from './source-view-container'
import { driveBrowserHeader } from './drive-browser-header'
import { driveBrowserItem } from './drive-browser-item'

export interface DriveBrowserProps {
    driveFiles: DriveFolder | undefined
    user: DriveUser | undefined
    handleSignOut: () => void | Promise<void>
    dataUpupSlot: string
    path: DriveFolder[]
    setPath: (p: DriveFolder[]) => void
    isClickLoading: boolean
    handleClick: (file: DriveFile) => void
    selectedFiles: DriveFile[]
    showLoader: boolean
    handleSubmit: () => void
    handleCancelDownload: () => void
    onSelectCurrentFolder: () => void
    error?: DriveBrowserError
    hasMore?: boolean
    isLoadingMore?: boolean
    loadMore?: () => void | Promise<void>
}

// Per-context search state (reset when props key changes)
interface DriveSearchState {
    searchTerm: string
    slotKey: string
}
const searchStateMap = new WeakMap<UploaderContext, DriveSearchState>()
function getDriveSearchState(
    ctx: UploaderContext,
    slot: string,
): DriveSearchState {
    let s = searchStateMap.get(ctx)
    if (!s || s.slotKey !== slot) {
        s = { searchTerm: '', slotKey: slot }
        searchStateMap.set(ctx, s)
    }
    return s
}

function filterItems(item: DriveFile, accept: string): boolean {
    if (item.isFolder) return true
    if (!accept || accept === '*') return true
    return accept.split(',').some(pattern => {
        const p = pattern.trim()
        if (p.startsWith('.')) return item.name.endsWith(p)
        if (p.endsWith('/*'))
            return item.mimeType?.startsWith(p.replace('/*', '/')) ?? false
        return item.mimeType === p
    })
}

export function driveBrowser(ctx: UploaderContext, props: DriveBrowserProps) {
    const {
        driveFiles,
        user,
        handleSignOut,
        dataUpupSlot,
        path,
        setPath,
        isClickLoading,
        handleClick,
        selectedFiles,
        showLoader,
        handleSubmit,
        handleCancelDownload,
        onSelectCurrentFolder,
        error,
        hasMore,
        isLoadingMore,
        loadMore,
    } = props

    const isDark = ctx.theme.getSnapshot().isDark
    const slot = ctx.theme.getSnapshot().slotOverrides
    const tr = ctx.translations
    const allowedFileTypes = ctx.props.allowedFileTypes

    const ss = getDriveSearchState(ctx, dataUpupSlot)

    // error short-circuits the perpetual loader — the exact F-123/F-124 symptom.
    const isLoading = !error && (isClickLoading || !driveFiles)

    const currentFolder = path[path.length - 1]
    const items =
        currentFolder?.children?.filter(item =>
            filterItems(item as DriveFile, allowedFileTypes),
        ) ?? []

    const displayedItems =
        searchDriveFiles(items as DriveFile[], ss.searchTerm) ?? []

    const inner = html` <div
        data-testid="upup-drive-browser"
        class="upup-grid upup-h-full upup-w-full upup-grid-rows-[auto,1fr,auto] upup-overflow-auto"
    >
        ${driveBrowserHeader(ctx, {
            user,
            path,
            setPath,
            handleSignOut,
            showSearch: !!items?.length,
            searchTerm: ss.searchTerm,
            onSearch: (v: string) => {
                ss.searchTerm = v
                ctx.invalidate()
            },
        })}
        ${path.length > 0
            ? html` <div
                  class=${cn(
                      'upup-h-full upup-overflow-y-scroll upup-bg-black/[0.075] upup-pt-2',
                      {
                          'upup-bg-white/10 upup-text-[#fafafa] dark:upup-bg-white/10 dark:upup-text-[#fafafa]':
                              isDark,
                      },
                      slot.driveBody,
                  )}
              >
                  ${error
                      ? html` <p
                            data-testid="upup-drive-error"
                            data-upup-slot="drive-error"
                            role="alert"
                            class="upup-p-4 upup-text-sm upup-text-red-600 dark:upup-text-red-400"
                        >
                            ${t(tr.driveLoadError, { message: error.message })}
                        </p>`
                      : nothing}
                  ${displayedItems.length > 0
                      ? html` <ul class="upup-p-2">
                            ${repeat(
                                displayedItems,
                                file => (file as DriveFile).id,
                                file =>
                                    driveBrowserItem(ctx, {
                                        item: file as DriveFile,
                                        isSelected: selectedFiles.some(
                                            f =>
                                                f.id === (file as DriveFile).id,
                                        ),
                                        isClickLoading:
                                            isClickLoading || showLoader,
                                        onClick: () => {
                                            if (!isClickLoading && !showLoader)
                                                handleClick(file as DriveFile)
                                        },
                                    }),
                            )}
                        </ul>`
                      : nothing}
                  ${displayedItems.length === 0 && !error
                      ? html` <div
                            class="upup-flex upup-h-full upup-flex-col upup-items-center upup-justify-center"
                        >
                            <p class="upup-text-xs upup-opacity-70">
                                ${tr.noAcceptedFilesFound}
                            </p>
                        </div>`
                      : nothing}
                  ${hasMore
                      ? html` <button
                            data-testid="upup-drive-load-more"
                            data-upup-slot="drive-load-more"
                            class="upup-mx-auto upup-my-2 upup-block upup-rounded-md upup-px-3 upup-py-1.5 upup-text-sm upup-text-blue-600 disabled:upup-opacity-50"
                            ?disabled=${isLoadingMore}
                            @click=${() => {
                                loadMore?.()
                            }}
                        >
                            ${isLoadingMore ? tr.loading : tr.loadMore}
                        </button>`
                      : nothing}
              </div>`
            : nothing}
        ${selectedFiles.length > 0 || !!onSelectCurrentFolder
            ? html` <div
                  class=${cn(
                      'upup-flex upup-origin-bottom upup-items-center upup-justify-start upup-gap-4 upup-bg-black/[0.025] upup-px-3 upup-py-2',
                      {
                          'upup-bg-white/5 upup-text-[#fafafa] dark:upup-bg-white/5 dark:upup-text-[#fafafa]':
                              isDark,
                      },
                      slot.driveFooter,
                  )}
              >
                  ${onSelectCurrentFolder
                      ? html` <button
                            class=${cn(
                                'upup-rounded-md upup-bg-transparent upup-px-3 upup-py-2 upup-text-sm upup-font-medium upup-text-blue-600 upup-transition-all upup-duration-300',
                                {
                                    'upup-text-[#30C5F7] dark:upup-text-[#30C5F7]':
                                        isDark,
                                },
                            )}
                            ?disabled=${showLoader}
                            @click=${() => {
                                onSelectCurrentFolder()
                            }}
                        >
                            ${tr.selectThisFolder}
                        </button>`
                      : nothing}
                  <button
                      class=${cn(
                          'upup-rounded-md upup-bg-blue-600 upup-px-3 upup-py-2 upup-text-sm upup-font-medium upup-text-white upup-transition-all upup-duration-300',
                          {
                              'upup-animate-pulse': showLoader,
                              'upup-bg-[#30C5F7] dark:upup-bg-[#30C5F7]':
                                  isDark,
                          },
                          slot.driveAddFilesButton,
                      )}
                      ?disabled=${showLoader}
                      @click=${() => {
                          handleSubmit()
                      }}
                  >
                      ${t(plural(tr, 'addFiles', selectedFiles.length), {
                          count: selectedFiles.length,
                      })}
                  </button>
                  <button
                      class=${cn(
                          'upup-ml-auto upup-rounded-md upup-p-1 upup-text-sm upup-text-blue-600 upup-transition-all upup-duration-300',
                          {
                              'upup-text-[#30C5F7] dark:upup-text-[#30C5F7]':
                                  isDark,
                          },
                          slot.driveCancelFilesButton,
                      )}
                      ?disabled=${showLoader}
                      @click=${() => {
                          handleCancelDownload()
                      }}
                  >
                      ${tr.cancel}
                  </button>
              </div>`
            : nothing}
    </div>`

    return sourceViewContainer(ctx, { isLoading, dataUpupSlot }, inner)
}
