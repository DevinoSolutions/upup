import { html, nothing, type TemplateResult } from 'lit-html'
import { repeat } from 'lit-html/directives/repeat.js'
import { formatUiMessage as t, pluralUiMessage as plural } from '@upupjs/core'
import { cn, searchDriveFiles } from '@upupjs/core/internal'
import type {
    DriveBrowserError,
    DriveFile,
    DriveFolder,
    DriveUser,
} from '@upupjs/core'
import type { UploaderContext } from '../../lib/types'
import { sourceViewContainer } from './source-view-container'
import { driveBrowserHeader } from './drive-browser-header'
import { driveBrowserItem } from './drive-browser-item'
import { icon } from '../icon'

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
    onSelectCurrentFolder?: () => void
    error?: DriveBrowserError | undefined
    hasMore?: boolean
    isLoadingMore?: boolean
    loadMore?: () => void | Promise<void>
}

// Per-context search state (reset when props key changes). `searchOpen` is the
// collapsed/expanded toggle for the navigated search; `focusPending` is a
// one-shot flag consumed by the header's input ref to focus exactly on the open
// transition (mirrors React's focus-on-expand effect).
interface DriveSearchState {
    searchTerm: string
    searchOpen: boolean
    focusPending: boolean
    slotKey: string
}
const searchStateMap = new WeakMap<UploaderContext, DriveSearchState>()
function getDriveSearchState(
    ctx: UploaderContext,
    slot: string,
): DriveSearchState {
    let s = searchStateMap.get(ctx)
    if (!s || s.slotKey !== slot) {
        s = {
            searchTerm: '',
            searchOpen: false,
            focusPending: false,
            slotKey: slot,
        }
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
            return item.mimeType.startsWith(p.replace('/*', '/'))
        return item.mimeType === p
    })
}

export function driveBrowser(
    ctx: UploaderContext,
    props: DriveBrowserProps,
): TemplateResult {
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

    // error short-circuits the perpetual loader — the exact F-123/F-124 symptom.
    const isLoading = !error && (isClickLoading || !driveFiles)

    if (isLoading) {
        return sourceViewContainer(
            ctx,
            { isLoading, dataUpupSlot },
            icon('loader'),
        )
    }

    const ss = getDriveSearchState(ctx, dataUpupSlot)

    const currentFolder = path[path.length - 1]
    const items =
        currentFolder?.children.filter(item =>
            filterItems(item, allowedFileTypes),
        ) ?? []

    const displayedItems = searchDriveFiles(items, ss.searchTerm)

    const inner = html` <div
        data-testid="upup-drive-browser"
        class="upup-grid upup-h-full upup-w-full upup-grid-rows-[auto,1fr,auto] upup-overflow-auto"
    >
        ${driveBrowserHeader(ctx, {
            user,
            path,
            setPath,
            handleSignOut,
            showSearch: !!items.length,
            searchTerm: ss.searchTerm,
            onSearch: (v: string) => {
                ss.searchTerm = v
                ctx.invalidate()
            },
            searchOpen: ss.searchOpen,
            setSearchOpen: (open: boolean) => {
                ss.searchOpen = open
                if (open) ss.focusPending = true
                ctx.invalidate()
            },
            focusPending: ss.focusPending,
            onSearchFocused: () => {
                ss.focusPending = false
            },
        })}
        <div
            class=${cn(
                // Transparent on the panel gradient — no inner box.
                'upup-h-full upup-overflow-y-auto upup-pt-2',
                {
                    'upup-text-[#fafafa] dark:upup-text-[#fafafa]': isDark,
                },
                slot.driveBody,
            )}
        >
            ${
                // Error state: a calm centered message, not a banner strip.
                error
                    ? html` <div
                          class="upup-flex upup-h-full upup-flex-col upup-items-center upup-justify-center upup-px-6 upup-text-center"
                      >
                          <p
                              data-testid="upup-drive-error"
                              data-upup-slot="drive-error"
                              role="alert"
                              class="upup-text-sm upup-text-red-600 dark:upup-text-red-400"
                          >
                              ${t(tr.driveLoadError, {
                                  message: error.message,
                              })}
                          </p>
                      </div>`
                    : nothing
            }
            ${
                displayedItems.length > 0
                    ? html` <ul class="upup-p-2">
                          ${repeat(
                              displayedItems,
                              file => file.id,
                              file =>
                                  driveBrowserItem(ctx, {
                                      item: file,
                                      isSelected: selectedFiles.some(
                                          f => f.id === file.id,
                                      ),
                                      isClickLoading:
                                          isClickLoading || showLoader,
                                      onClick: () => {
                                          if (!isClickLoading && !showLoader)
                                              handleClick(file)
                                      },
                                  }),
                          )}
                      </ul>`
                    : nothing
            }
            ${
                displayedItems.length === 0 && !error
                    ? html` <div
                          class="upup-flex upup-h-full upup-flex-col upup-items-center upup-justify-center"
                      >
                          <p class="upup-text-xs upup-opacity-70">
                              ${tr.noAcceptedFilesFound}
                          </p>
                      </div>`
                    : nothing
            }
            ${
                hasMore
                    ? html` <button
                          data-testid="upup-drive-load-more"
                          data-upup-slot="drive-load-more"
                          class="upup-mx-auto upup-my-2 upup-block upup-rounded-md upup-px-3 upup-py-1.5 upup-text-sm upup-text-[#0284c7] disabled:upup-opacity-50"
                          ?disabled=${isLoadingMore}
                          @click=${() => {
                              void loadMore?.()
                          }}
                      >
                          ${isLoadingMore ? tr.loading : tr.loadMore}
                      </button>`
                    : nothing
            }
        </div>

        ${
            // Footer only when there is something to act on — never under an
            // error state. Hairline divider, no inner box.
            (selectedFiles.length > 0 || !!onSelectCurrentFolder) && !error
                ? html` <div
                      class=${cn(
                          'upup-flex upup-origin-bottom upup-items-center upup-justify-start upup-gap-4 upup-border-t upup-px-3 upup-py-2',
                          isDark
                              ? 'upup-border-white/[0.08] upup-text-[#fafafa]'
                              : 'upup-border-black/[0.06]',
                          slot.driveFooter,
                      )}
                  >
                      ${
                          onSelectCurrentFolder
                              ? html` <button
                                    class=${cn(
                                        'upup-rounded-md upup-bg-transparent upup-px-3 upup-py-2 upup-text-sm upup-font-medium upup-text-[#0284c7] upup-transition-all upup-duration-300',
                                        {
                                            'upup-text-[#38bdf8] dark:upup-text-[#38bdf8]':
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
                              : nothing
                      }
                      <button
                          class=${cn(
                              'upup-rounded-md upup-bg-[#0ea5e9] upup-px-3 upup-py-2 upup-text-sm upup-font-medium upup-text-white upup-transition-all upup-duration-300',
                              {
                                  'upup-animate-pulse': showLoader,
                                  'upup-bg-[#38bdf8] dark:upup-bg-[#38bdf8]':
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
                              'upup-ml-auto upup-rounded-md upup-p-1 upup-text-sm upup-text-[#0284c7] upup-transition-all upup-duration-300',
                              {
                                  'upup-text-[#38bdf8] dark:upup-text-[#38bdf8]':
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
                : nothing
        }
    </div>`

    return sourceViewContainer(ctx, { isLoading, dataUpupSlot }, inner)
}
