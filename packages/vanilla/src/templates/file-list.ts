import { html, nothing, type TemplateResult } from 'lit-html'
import { ref } from 'lit-html/directives/ref.js'
import { repeat } from 'lit-html/directives/repeat.js'
import {
    Virtualizer,
    observeElementRect,
    observeElementOffset,
    elementScroll,
} from '@tanstack/virtual-core'
import {
    formatUiMessage as t,
    pluralUiMessage as plural,
    UploadStatus,
} from '@upupjs/core'
import { isUploadActive, cn } from '@upupjs/core/internal'
import type { UploaderContext } from '../lib/types'
import { fileItem } from './file-item'
import { fileHero } from './file-hero'
import { uploaderHeader } from './shared/uploader-header'
import { progressBar } from './shared/progress-bar'
import { fileSuccessCheck } from './shared/file-success-check'
import { icon } from './icon'
import { isListViewForced } from '../lib/view-mode'
import { getTilesPerRow, observeTiles } from '../lib/use-tiles-per-row'

const VIRTUAL_SCROLL_THRESHOLD = 20
const ESTIMATED_ITEM_HEIGHT = 76

interface VirtualizerEntry {
    v: Virtualizer<HTMLDivElement, HTMLDivElement>
    /** Cleanup fn returned by v._didMount() — calls v.cleanup() which disconnects
     *  the ResizeObserver and removes all scroll/scrollend event listeners. */
    unmount: () => void
}
const virtualizers = new WeakMap<UploaderContext, VirtualizerEntry>()

const scrollEls = new WeakMap<UploaderContext, HTMLDivElement | null>()
const scrollRefCbs = new WeakMap<
    UploaderContext,
    (el: Element | undefined) => void
>()
function getScrollRefCb(
    ctx: UploaderContext,
): (el: Element | undefined) => void {
    let cb = scrollRefCbs.get(ctx)
    if (!cb) {
        cb = (el: Element | undefined) => {
            const next = (el as HTMLDivElement | undefined) ?? null
            const prev = scrollEls.get(ctx) ?? null
            if (next === prev) return
            scrollEls.set(ctx, next)
            // Measure the scroll container for the tiles-per-row / forced-list rule.
            observeTiles(ctx, next)
            // null -> element (scroll container just mounted): re-render so the virtual branch,
            // which gates on the now-available element, can engage. Stable cb identity means
            // lit-html only invokes this on real mount/unmount (no per-render churn / no loop).
            if (next && !prev) ctx.invalidate()
        }
        scrollRefCbs.set(ctx, cb)
    }
    return cb
}

function getVirtualizer(
    ctx: UploaderContext,
    count: number,
    scrollEl: HTMLDivElement,
): Virtualizer<HTMLDivElement, HTMLDivElement> {
    const entry = virtualizers.get(ctx)
    if (!entry) {
        const v = new Virtualizer<HTMLDivElement, HTMLDivElement>({
            count,
            getScrollElement: () => scrollEl,
            estimateSize: () => ESTIMATED_ITEM_HEIGHT,
            overscan: 5,
            observeElementRect,
            observeElementOffset,
            scrollToFn: elementScroll,
            onChange: () => {
                ctx.invalidate()
            },
        })
        v._willUpdate()
        const unmount = v._didMount()
        virtualizers.set(ctx, { v, unmount })
        return v
    } else {
        entry.v.setOptions({
            ...entry.v.options,
            count,
            getScrollElement: () => scrollEl,
            estimateSize: () => ESTIMATED_ITEM_HEIGHT,
            overscan: 5,
        })
        entry.v._willUpdate()
        return entry.v
    }
}

export function destroyFileList(ctx: UploaderContext): void {
    const entry = virtualizers.get(ctx)
    if (entry) {
        entry.unmount()
    }
    virtualizers.delete(ctx)
    scrollEls.delete(ctx)
    scrollRefCbs.delete(ctx)
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${Math.round((bytes / Math.pow(k, i)) * 10) / 10} ${sizes[i] ?? ''}`
}

function formatEta(seconds: number): string {
    if (seconds <= 0 || !isFinite(seconds)) return ''
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    if (m > 0) return `${m}m ${s}s left`
    return `${s}s left`
}

export function fileList(ctx: UploaderContext): TemplateResult {
    const o = ctx.orchestrator.getSnapshot()
    // Render in CORE's insertion order (FileManager's Map preserves it, stable
    // across renders and unchanged by in-place updateFile). Never re-sort
    // (round-7 item 3).
    const orderedFiles = [...ctx.core.files.values()]
    const tr = ctx.translations
    const viewMode = o.viewMode
    const activeSource = o.activeSource
    const tui = ctx.getTransientUi()
    const { sourceOverlayOpen, leavingFileIds } = tui

    const { isDark } = ctx.theme.getSnapshot()
    const slot = ctx.theme.getSnapshot().slotOverrides
    const themeSlots = ctx.theme.getSnapshot().slots
    const { isProcessing, resumable, limit, quietCompletion } = ctx.props

    const isSingle = orderedFiles.length === 1

    // Adaptive layout: the square-tile grid is only honored when every tile fits
    // in ONE row of the fixed-height panel (measured from the scroll container);
    // past it the row list is FORCED and the header hides the grid/list toggle.
    const tilesPerRow = getTilesPerRow(ctx)
    const forcedList = isListViewForced(orderedFiles.length, tilesPerRow)
    const effectiveViewMode = forcedList ? 'list' : viewMode

    const shouldVirtualize =
        orderedFiles.length >= VIRTUAL_SCROLL_THRESHOLD &&
        effectiveViewMode !== 'grid'

    const uploadStatus = o.uploadStatus
    const isUploading = isUploadActive(uploadStatus)
    // When the add-more source surface is up, this list stays mounted but dimmed
    // and inert behind it.
    const dimmed = sourceOverlayOpen || !!activeSource
    const heroLeaving =
        isSingle && !!orderedFiles[0] && leavingFileIds.has(orderedFiles[0].id)
    // Quiet completion: a successful run shows ONLY the checkmark overlay.
    const quietDone =
        quietCompletion && uploadStatus === UploadStatus.SUCCESSFUL
    const canAddMore =
        limit > 1 &&
        ctx.core.files.size < limit &&
        !isUploading &&
        !isProcessing &&
        !quietDone

    const uploadError = o.uploadError
    const uploadErrorCode = o.uploadErrorCode
    const totalProgress = o.totalProgress
    const uploadSpeed = o.uploadSpeed
    const uploadEta = o.uploadEta
    const uploadedBytes = o.uploadedBytes
    const totalBytes = o.totalBytes

    const persistedScrollEl = scrollEls.get(ctx) ?? null

    const inner =
        shouldVirtualize && persistedScrollEl
            ? (() => {
                  const v = getVirtualizer(
                      ctx,
                      orderedFiles.length,
                      persistedScrollEl,
                  )
                  return html` <div
                      role="list"
                      data-upup-slot="file-list-virtual"
                      style=${`height: ${v.getTotalSize()}px; position: relative;`}
                      class=${cn(
                          isProcessing
                              ? 'upup-pointer-events-none upup-opacity-75'
                              : '',
                          'upup-font-[Arial,Helvetica,sans-serif]',
                      )}
                  >
                      ${repeat(
                          v.getVirtualItems(),
                          vi => String(vi.key),
                          vi => {
                              const file = orderedFiles[vi.index]
                              return html` <div
                                  data-index=${vi.index}
                                  style=${`position: absolute; top: 0; left: 0; width: 100%; transform: translateY(${vi.start}px); padding-bottom: 12px;`}
                              >
                                  ${
                                      file
                                          ? fileItem(
                                                ctx,
                                                file,
                                                vi.index,
                                                forcedList,
                                            )
                                          : ''
                                  }
                              </div>`
                          },
                      )}
                  </div>`
              })()
            : html` <div
                  role="list"
                  style=${
                      ctx.core.files.size > 1 && effectiveViewMode === 'grid'
                          ? 'grid-template-columns: repeat(auto-fit, minmax(160px, 1fr))'
                          : nothing
                  }
                  class=${cn(
                      isProcessing
                          ? 'upup-pointer-events-none upup-opacity-75'
                          : '',
                      'upup-font-[Arial,Helvetica,sans-serif]',
                      ctx.core.files.size > 1 && effectiveViewMode === 'grid'
                          ? 'upup-grid upup-gap-4'
                          : 'upup-flex upup-flex-col upup-gap-3',
                      {
                          [slot.fileListContainerInnerMultiple ?? '']:
                              !!slot.fileListContainerInnerMultiple &&
                              ctx.core.files.size > 1,
                          [slot.fileListContainerInnerSingle ?? '']:
                              !!slot.fileListContainerInnerSingle &&
                              ctx.core.files.size === 1,
                      },
                  )}
              >
                  ${repeat(
                      orderedFiles,
                      f => f.id,
                      (f, index) => fileItem(ctx, f, index, forcedList),
                  )}
              </div>`

    return html` <div
        data-testid="upup-file-list"
        data-upup-slot="file-list"
        ?inert=${dimmed}
        class=${cn(
            'upup-relative upup-flex upup-h-full upup-flex-col upup-rounded-lg upup-shadow',
            {
                'upup-hidden': !ctx.core.files.size,
                'upup-opacity-50 upup-blur-[2px] upup-pointer-events-none':
                    dimmed,
            },
            themeSlots.fileList?.root,
        )}
    >
        <div role="status" aria-live="polite" class="upup-sr-only">
            ${t(plural(tr, 'filesSelected', ctx.core.files.size), {
                count: ctx.core.files.size,
            })}
        </div>
        ${uploaderHeader(
            ctx,
            () => {
                ctx.handleCancel()
            },
            { forcedList, hideAddMore: quietDone },
        )}
        ${
            quietDone
                ? html`<div
                      data-testid="upup-complete-check"
                      data-upup-slot="complete-check"
                      role="status"
                      class=${cn(
                          'upup-absolute upup-inset-0 upup-z-20 upup-flex upup-flex-col upup-items-center upup-justify-center upup-gap-2 upup-rounded-lg upup-backdrop-blur-[1px]',
                          isDark ? 'upup-bg-[#04080f]/40' : 'upup-bg-white/50',
                      )}
                  >
                      ${fileSuccessCheck({ size: 56 })}
                      <span
                          class=${cn(
                              'upup-text-sm upup-font-medium',
                              isDark
                                  ? 'upup-text-[#e2e8f0]'
                                  : 'upup-text-[#1e293b]',
                          )}
                      >
                          ${tr.announceUploadComplete}
                      </span>
                  </div>`
                : nothing
        }
        <div
            ${ref(getScrollRefCb(ctx))}
            class=${cn(
                'upup-preview-scroll upup-flex upup-flex-1 upup-flex-col upup-overflow-y-auto upup-p-3',
                isDark ? 'upup-bg-transparent' : 'upup-bg-black/[0.075]',
                slot.fileListContainer,
            )}
        >
            ${
                isSingle && orderedFiles[0]
                    ? html`<div
                          role="list"
                          class=${cn(
                              'upup-animate-fx-enter upup-flex upup-min-h-0 upup-flex-1 upup-flex-col',
                              heroLeaving &&
                                  'upup-animate-fx-exit upup-overflow-hidden',
                          )}
                      >
                          ${fileHero(ctx, orderedFiles[0])}
                      </div>`
                    : inner
            }
            ${
                canAddMore
                    ? html`<button
                          data-testid="upup-add-more"
                          data-placement="footer"
                          data-upup-slot="add-more"
                          class=${cn(
                              'upup-fx-hover-lift upup-fx-press upup-mt-2.5 upup-flex upup-flex-none upup-items-center upup-justify-center upup-gap-2 upup-whitespace-nowrap upup-rounded-xl upup-border-[1.5px] upup-border-dashed upup-px-3 upup-py-2 upup-text-[13px] upup-font-medium',
                              isDark
                                  ? 'upup-border-white/[0.16] upup-text-[#94a3b8]'
                                  : 'upup-border-black/[0.16] upup-text-gray-500',
                              slot.containerAddMoreButton,
                          )}
                          @click=${() => {
                              ctx.openSourceOverlay()
                          }}
                          ?disabled=${isUploading || isProcessing}
                      >
                          ${icon('plus')} ${tr.addMore}
                      </button>`
                    : nothing
            }
        </div>
        <div
            class=${cn(
                'upup-shadow-top upup-flex upup-items-center upup-gap-3 upup-rounded-b-lg upup-bg-black/[0.025] upup-px-3 upup-py-2',
                { 'upup-bg-white/5 dark:upup-bg-white/5': isDark },
                slot.fileListFooter,
            )}
        >
            ${
                uploadStatus !== UploadStatus.SUCCESSFUL &&
                uploadStatus !== UploadStatus.FAILED &&
                uploadStatus !== UploadStatus.PAUSED &&
                !isUploading
                    ? html`<button
                          data-testid="upup-upload-btn"
                          class=${cn(
                              'upup-fx-sheen-sweep upup-fx-press upup-disabled:animate-pulse upup-ml-auto upup-rounded-full upup-bg-[#0ea5e9] upup-px-4 upup-py-2 upup-text-sm upup-font-medium upup-text-white',
                              {
                                  'upup-bg-[#38bdf8] dark:upup-bg-[#38bdf8]':
                                      isDark,
                              },
                              slot.uploadButton,
                          )}
                          @click=${() => {
                              void ctx.startUpload().catch(() => undefined)
                          }}
                          ?disabled=${
                              isUploadActive(uploadStatus) || isProcessing
                          }
                      >
                          ${t(plural(tr, 'uploadFiles', ctx.core.files.size), {
                              count: ctx.core.files.size,
                          })}
                      </button>`
                    : nothing
            }
            ${
                uploadStatus === UploadStatus.FAILED && uploadError
                    ? html`<p
                          data-testid="upup-upload-error"
                          data-upup-slot="upload-error"
                          title=${uploadErrorCode ?? ''}
                          class="upup-mr-auto upup-text-sm upup-text-red-600 dark:upup-text-red-400"
                      >
                          ${
                              uploadErrorCode
                                  ? t(tr.uploadFailedWithCode, {
                                        code: uploadErrorCode,
                                    })
                                  : t(tr.uploadFailed, { message: uploadError })
                          }
                      </p>`
                    : nothing
            }
            ${
                uploadStatus === UploadStatus.FAILED
                    ? html`<button
                          data-testid="upup-retry-btn"
                          class=${cn(
                              'upup-fx-press upup-disabled:animate-pulse upup-ml-auto upup-rounded-full upup-bg-red-600 upup-px-4 upup-py-2 upup-text-sm upup-font-medium upup-text-white',
                              {
                                  'upup-bg-red-500 dark:upup-bg-red-500':
                                      isDark,
                              },
                              slot.uploadButton,
                          )}
                          @click=${() => {
                              void ctx.retryUpload().catch(() => undefined)
                          }}
                      >
                          ${
                              resumable?.protocol === 'multipart'
                                  ? tr.resumeUpload
                                  : tr.retryUpload
                          }
                      </button>`
                    : nothing
            }
            ${
                uploadStatus === UploadStatus.SUCCESSFUL && !quietCompletion
                    ? html`<button
                          class=${cn(
                              'upup-fx-sheen-sweep upup-fx-press upup-disabled:animate-pulse upup-ml-auto upup-rounded-lg upup-bg-[#0ea5e9] upup-px-3 upup-py-2 upup-text-sm upup-font-medium upup-text-white',
                              {
                                  'upup-bg-[#38bdf8] dark:upup-bg-[#38bdf8]':
                                      isDark,
                              },
                              slot.uploadDoneButton,
                          )}
                          @click=${() => {
                              ctx.handleDone()
                          }}
                      >
                          ${tr.done}
                      </button>`
                    : nothing
            }
            <div class="upup-flex upup-flex-1 upup-flex-col upup-gap-1">
                <div class="upup-flex upup-items-center upup-gap-2">
                    ${
                        uploadStatus === UploadStatus.UPLOADING
                            ? html`<button
                                  data-testid="upup-upload-cancel"
                                  class=${cn(
                                      'upup-fx-press upup-flex upup-h-7 upup-items-center upup-gap-1 upup-whitespace-nowrap upup-rounded-full upup-bg-red-100 upup-px-3 upup-text-xs upup-font-medium upup-text-red-700 upup-transition-colors hover:upup-bg-red-200',
                                      {
                                          'upup-bg-red-500/20 upup-text-red-100 hover:upup-bg-red-500/30':
                                              isDark,
                                      },
                                  )}
                                  @click=${() => {
                                      ctx.handlePause()
                                  }}
                                  aria-label=${tr.cancel}
                                  title=${tr.cancel}
                              >
                                  ${icon('x', { size: 14 })} ${tr.cancel}
                              </button>`
                            : nothing
                    }
                    ${
                        uploadStatus === UploadStatus.PAUSED
                            ? html`<button
                                  data-testid="upup-upload-resume"
                                  class=${cn(
                                      'upup-fx-press upup-flex upup-h-7 upup-items-center upup-gap-1 upup-whitespace-nowrap upup-rounded-full upup-bg-[#0ea5e9] upup-px-3 upup-text-xs upup-font-medium upup-text-white upup-transition-colors',
                                      {
                                          'upup-bg-[#38bdf8] dark:upup-bg-[#38bdf8]':
                                              isDark,
                                      },
                                  )}
                                  @click=${() => {
                                      ctx.handleResume()
                                  }}
                                  aria-label=${tr.resumeUpload}
                                  title=${tr.resumeUpload}
                              >
                                  ${icon('player-play', { size: 14 })}
                                  ${tr.resumeUpload}
                              </button>`
                            : nothing
                    }
                    ${progressBar(ctx, {
                        progress: totalProgress,
                        showValue: true,
                        class: 'upup-flex-1',
                        progressBarClassName: 'upup-rounded',
                    })}
                </div>
                ${
                    (isUploadActive(uploadStatus) ||
                        uploadStatus === UploadStatus.PAUSED) &&
                    totalBytes > 0
                        ? html`<div
                              class=${cn(
                                  'upup-flex upup-items-center upup-justify-between upup-text-[11px] upup-text-gray-500',
                                  { 'upup-text-gray-400': isDark },
                              )}
                          >
                              <span>
                                  ${formatBytes(uploadedBytes)} of
                                  ${formatBytes(totalBytes)}
                                  ${
                                      uploadSpeed > 0
                                          ? html`&middot;
                                            ${formatBytes(uploadSpeed)}/s`
                                          : nothing
                                  }
                              </span>
                              ${
                                  isUploadActive(uploadStatus) && uploadEta > 0
                                      ? html`<span
                                            >${formatEta(uploadEta)}</span
                                        >`
                                      : nothing
                              }
                              ${
                                  uploadStatus === UploadStatus.PAUSED
                                      ? html`<span>${tr.paused}</span>`
                                      : nothing
                              }
                          </div>`
                        : nothing
                }
            </div>
        </div>
    </div>`
}
