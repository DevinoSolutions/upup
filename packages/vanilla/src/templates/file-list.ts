import { html, nothing } from 'lit-html'
import { ref } from 'lit-html/directives/ref.js'
import { repeat } from 'lit-html/directives/repeat.js'
import { Virtualizer, observeElementRect, observeElementOffset, elementScroll } from '@tanstack/virtual-core'
import {
  formatUiMessage as t,
  pluralUiMessage as plural,
  isUploadActive,
  UploadStatus,
  cn,
} from '@upup/core'
import type { UploadFile } from '@upup/core'
import type { RootContext } from '../lib/types'
import { fileItem } from './file-item'
import { mainBoxHeader } from './shared/main-box-header'
import { progressBar } from './shared/progress-bar'
import { XIcon, PlayerPlayFilledIcon, PlayerPauseFilledIcon } from './icons'

const VIRTUAL_SCROLL_THRESHOLD = 20
const ESTIMATED_ITEM_HEIGHT = 76

interface VirtualizerEntry {
  v: Virtualizer<HTMLDivElement, HTMLDivElement>
  /** Cleanup fn returned by v._didMount() — calls v.cleanup() which disconnects
   *  the ResizeObserver and removes all scroll/scrollend event listeners. */
  unmount: () => void
}
const virtualizers = new WeakMap<RootContext, VirtualizerEntry>()

const scrollEls = new WeakMap<RootContext, HTMLDivElement | null>()
const scrollRefCbs = new WeakMap<RootContext, (el: Element | undefined) => void>()
function getScrollRefCb(ctx: RootContext): (el: Element | undefined) => void {
  let cb = scrollRefCbs.get(ctx)
  if (!cb) {
    cb = (el: Element | undefined) => {
      const next = (el as HTMLDivElement | undefined) ?? null
      const prev = scrollEls.get(ctx) ?? null
      if (next === prev) return
      scrollEls.set(ctx, next)
      // null -> element (scroll container just mounted): re-render so the virtual branch,
      // which gates on the now-available element, can engage. Stable cb identity means
      // lit-html only invokes this on real mount/unmount (no per-render churn / no loop).
      if (next && !prev) ctx.invalidate()
    }
    scrollRefCbs.set(ctx, cb)
  }
  return cb
}

function getVirtualizer(ctx: RootContext, count: number, scrollEl: HTMLDivElement): Virtualizer<HTMLDivElement, HTMLDivElement> {
  const entry = virtualizers.get(ctx)
  if (!entry) {
    const v = new Virtualizer<HTMLDivElement, HTMLDivElement>({
      count, getScrollElement: () => scrollEl, estimateSize: () => ESTIMATED_ITEM_HEIGHT, overscan: 5,
      observeElementRect, observeElementOffset, scrollToFn: elementScroll, onChange: () => ctx.invalidate(),
    })
    // _willUpdate() wires the scroll element (attaches ResizeObserver + scroll listeners via
    // observeElementRect/observeElementOffset) on first call; must be called before first render.
    v._willUpdate()
    // _didMount() returns the public cleanup fn (calls internal cleanup(): disconnect observer +
    // cancel rAF + remove scroll listeners). Store it so disposeFileList can call it on destroy().
    const unmount = v._didMount()
    virtualizers.set(ctx, { v, unmount })
    return v
  } else {
    entry.v.setOptions({ ...entry.v.options, count, getScrollElement: () => scrollEl, estimateSize: () => ESTIMATED_ITEM_HEIGHT, overscan: 5 })
    entry.v._willUpdate()
    return entry.v
  }
}

export function disposeFileList(ctx: RootContext) {
  const entry = virtualizers.get(ctx)
  if (entry) {
    // Call the cleanup fn returned by _didMount() — this is the public API for teardown.
    // It disconnects the ResizeObserver and removes all scroll/scrollend listeners,
    // preventing leaks after the uploader is destroyed.
    entry.unmount()
  }
  virtualizers.delete(ctx)
  scrollEls.delete(ctx)
  scrollRefCbs.delete(ctx)
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 10) / 10 + ' ' + sizes[i]
}

function formatEta(seconds: number): string {
  if (seconds <= 0 || !isFinite(seconds)) return ''
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m > 0) return `${m}m ${s}s left`
  return `${s}s left`
}

export function fileList(ctx: RootContext) {
  const o = ctx.orchestrator.getSnapshot()
  const files = [...ctx.core.files.values()]
  // Sort by relativePath || name (mirrors FileList.svelte sort)
  const sortedFiles: UploadFile[] = [...files].sort((a, b) => {
    const pa = a.relativePath || a.name
    const pb = b.relativePath || b.name
    return pa.localeCompare(pb) || a.name.localeCompare(b.name)
  })
  const viewMode = o.viewMode
  const tr = ctx.translations
  const activeAdapter = o.activeAdapter
  const isAddingMore = o.isAddingMore

  // Mirror svelte: hidden when isAddingMore OR activeAdapter OR !files.size
  // In vanilla we use early-return nothing (same semantic as upup-hidden)
  if (activeAdapter || (!sortedFiles.length && !isAddingMore)) return nothing

  const shouldVirtualize = sortedFiles.length >= VIRTUAL_SCROLL_THRESHOLD && viewMode !== 'grid'
  const uploadStatus = o.uploadStatus
  const uploading = isUploadActive(uploadStatus)
  const grid = viewMode === 'grid'
  const { isProcessing } = ctx.props
  const isMultipart = ctx.props.resumable?.protocol === 'multipart'
  const { isDark } = ctx.theme.getSnapshot()
  const slot = ctx.theme.getSnapshot().slotOverrides
  const themeSlots = ctx.theme.getSnapshot().slots

  const totalProgress = o.totalProgress
  const uploadSpeed = o.uploadSpeed
  const uploadEta = o.uploadEta
  const uploadedBytes = o.uploadedBytes
  const totalBytes = o.totalBytes

  // Pause/resume/cancel gated on multipart resumable (mirrors svelte FileList.svelte).

  const onUploadClick = () => { void ctx.proceedUpload().catch(() => undefined) }
  const onRetryClick = () => { void ctx.retryUpload().catch(() => undefined) }

  const footer = html`
    <div
      class=${cn(
        'upup-shadow-top upup-flex upup-items-center upup-gap-3 upup-rounded-b-lg upup-bg-black/[0.025] upup-px-3 upup-py-2',
        { 'upup-bg-white/5 dark:upup-bg-white/5': isDark },
        slot.fileListFooter,
      )}
    >
      ${uploadStatus !== UploadStatus.SUCCESSFUL && uploadStatus !== UploadStatus.FAILED
        ? html`
          <button
            data-testid="upup-upload-btn"
            class=${cn(
              'upup-disabled:animate-pulse upup-ml-auto upup-rounded-full upup-bg-blue-600 upup-px-4 upup-py-2 upup-text-sm upup-font-medium upup-text-white',
              { 'upup-bg-[#30C5F7] dark:upup-bg-[#30C5F7]': isDark },
              slot.uploadButton,
            )}
            @click=${onUploadClick}
            ?disabled=${uploading || uploadStatus === UploadStatus.PAUSED || isProcessing}
          >
            ${t(plural(tr, 'uploadFiles', sortedFiles.length), { count: sortedFiles.length })}
          </button>`
        : nothing}

      ${uploadStatus === UploadStatus.FAILED
        ? html`
          <button
            data-testid="upup-retry-btn"
            class=${cn(
              'upup-disabled:animate-pulse upup-ml-auto upup-rounded-full upup-bg-red-600 upup-px-4 upup-py-2 upup-text-sm upup-font-medium upup-text-white',
              { 'upup-bg-red-500 dark:upup-bg-red-500': isDark },
              slot.uploadButton,
            )}
            @click=${onRetryClick}
          >
            ${isMultipart ? tr.resumeUpload : tr.retryUpload}
          </button>`
        : nothing}

      ${uploadStatus === UploadStatus.SUCCESSFUL
        ? html`
          <button
            class=${cn(
              'upup-disabled:animate-pulse upup-ml-auto upup-rounded-lg upup-bg-blue-600 upup-px-3 upup-py-2 upup-text-sm upup-font-medium upup-text-white',
              { 'upup-bg-[#30C5F7] dark:upup-bg-[#30C5F7]': isDark },
              slot.uploadDoneButton,
            )}
            @click=${() => ctx.handleDone()}
          >
            ${tr.done}
          </button>`
        : nothing}

      <div class="upup-flex upup-flex-1 upup-flex-col upup-gap-1">
        <div class="upup-flex upup-items-center upup-gap-2">
          ${isMultipart && (uploading || uploadStatus === UploadStatus.PAUSED)
            ? html`
              <button
                data-testid="upup-upload-pause-toggle"
                class=${cn(
                  'upup-flex upup-h-7 upup-w-7 upup-items-center upup-justify-center upup-rounded-full upup-bg-gray-200 upup-text-gray-700 upup-transition-colors hover:upup-bg-gray-300',
                  { 'upup-bg-white/10 upup-text-white hover:upup-bg-white/20': isDark },
                )}
                @click=${() => uploadStatus === UploadStatus.PAUSED ? ctx.handleResume() : ctx.handlePause()}
                aria-label=${uploadStatus === UploadStatus.PAUSED ? tr.resumeUpload : tr.pauseUpload}
                title=${uploadStatus === UploadStatus.PAUSED ? tr.resumeUpload : tr.pauseUpload}
              >
                ${uploadStatus === UploadStatus.PAUSED ? PlayerPlayFilledIcon({ size: 14 }) : PlayerPauseFilledIcon({ size: 14 })}
              </button>
              <button
                data-testid="upup-upload-cancel-btn"
                class=${cn(
                  'upup-flex upup-h-7 upup-w-7 upup-items-center upup-justify-center upup-rounded-full upup-bg-red-100 upup-text-red-700 upup-transition-colors hover:upup-bg-red-200',
                  { 'upup-bg-red-500/20 upup-text-red-100 hover:upup-bg-red-500/30': isDark },
                )}
                @click=${() => ctx.handleCancel()}
                aria-label=${tr.cancel}
                title=${tr.cancel}
              >
                ${XIcon({ size: 14 })}
              </button>`
            : nothing}
          ${progressBar(ctx, { progress: totalProgress, showValue: true, class: 'upup-flex-1', progressBarClassName: 'upup-rounded' })}
        </div>

        ${(uploading || uploadStatus === UploadStatus.PAUSED) && totalBytes > 0
          ? html`
            <div
              class=${cn(
                'upup-flex upup-items-center upup-justify-between upup-text-[11px] upup-text-gray-500',
                { 'upup-text-gray-400': isDark },
              )}
            >
              <span>
                ${formatBytes(uploadedBytes)} of ${formatBytes(totalBytes)}
                ${uploadSpeed > 0 ? html`&middot; ${formatBytes(uploadSpeed)}/s` : nothing}
              </span>
              ${uploading && uploadEta > 0 ? html`<span>${formatEta(uploadEta)}</span>` : nothing}
              ${uploadStatus === UploadStatus.PAUSED ? html`<span>${tr.paused}</span>` : nothing}
            </div>`
          : nothing}
      </div>
    </div>`

  const persistedScrollEl = scrollEls.get(ctx) ?? null

  return html`
    <div
      class=${cn(
        'upup-relative upup-flex upup-h-full upup-flex-col upup-rounded-lg upup-shadow',
        { 'upup-hidden': isAddingMore },
        themeSlots?.fileList?.root,
      )}
      data-testid="upup-file-list"
      data-upup-slot="file-list"
    >
      ${mainBoxHeader(ctx, () => ctx.handleCancel())}
      <div
        ${ref(getScrollRefCb(ctx))}
        class=${cn(
          'upup-preview-scroll upup-flex upup-flex-1 upup-flex-col upup-overflow-y-auto upup-bg-black/[0.075] upup-p-3',
          { 'upup-bg-white/10 dark:upup-bg-white/10': isDark },
          slot.fileListContainer,
        )}
      >
        ${shouldVirtualize && persistedScrollEl
          ? (() => {
              const v = getVirtualizer(ctx, sortedFiles.length, persistedScrollEl)
              return html`
                <div
                  data-upup-slot="file-list-virtual"
                  style=${`height: ${v.getTotalSize()}px; position: relative;`}
                  class=${cn(
                    isProcessing ? 'upup-pointer-events-none upup-opacity-75' : '',
                    'upup-font-[Arial,Helvetica,sans-serif]',
                  )}
                >
                  ${repeat(v.getVirtualItems(), (vi) => String(vi.key), (vi) => html`
                    <div data-index=${vi.index} style=${`position: absolute; top: 0; left: 0; width: 100%; transform: translateY(${vi.start}px); padding-bottom: 12px;`}>
                      ${fileItem(ctx, sortedFiles[vi.index])}
                    </div>`)}
                </div>`
            })()
          : html`
            <div
              class=${cn(
                isProcessing ? 'upup-pointer-events-none upup-opacity-75' : '',
                'upup-flex upup-flex-col upup-gap-3 upup-font-[Arial,Helvetica,sans-serif]',
                {
                  'md:upup-grid md:upup-gap-y-6': sortedFiles.length > 1 && grid,
                  'md:upup-grid-cols-2': sortedFiles.length > 1 && grid,
                },
                {
                  [slot.fileListContainerInnerMultiple ?? '']: !!slot.fileListContainerInnerMultiple && sortedFiles.length > 1,
                  [slot.fileListContainerInnerSingle ?? '']: !!slot.fileListContainerInnerSingle && sortedFiles.length === 1,
                },
              )}
            >
              ${repeat(sortedFiles, (f) => f.id, (f) => fileItem(ctx, f))}
            </div>`}
      </div>
      ${progressBar(ctx, { progress: ctx.core.progress.percentage, showValue: true, class: 'upup-px-3' })}
      ${footer}
    </div>`
}
