import { html, nothing, type TemplateResult } from 'lit-html'
import { ref } from 'lit-html/directives/ref.js'
import { UploadStatus, formatUiMessage } from '@upupjs/core'
import { cn } from '../lib/cn'
import type { UploaderContext } from '../lib/types'
import { sourceView } from './source-view'
import { sourceSelector } from './source-selector'
import { fileList } from './file-list'
import { devinoDark, devinoLight, logoDark, logoLight } from '../assets/logos'

// ── Per-context imperative overlay state (sheet element + swipe + focus) ──
// The sheet-drawer needs a handle to its own DOM node (swipe transforms) and a
// record of the element that opened it (focus restore). Keyed by ctx so it is
// per-uploader and GC'd with the context. Stable ref callbacks (cached per ctx)
// mean lit-html only invokes them on real mount/unmount, never per render.
interface OverlayState {
    el: HTMLElement | null
    trigger: HTMLElement | null
    swipeStartY: number | null
    swiped: boolean
    refCb: (el: Element | undefined) => void
}
const overlayStates = new WeakMap<UploaderContext, OverlayState>()

function getOverlayState(ctx: UploaderContext): OverlayState {
    let s = overlayStates.get(ctx)
    if (!s) {
        s = {
            el: null,
            trigger: null,
            swipeStartY: null,
            swiped: false,
            refCb: () => {},
        }
        s.refCb = (el: Element | undefined) => {
            const next = (el as HTMLElement | undefined) ?? null
            const prev = s!.el
            if (next === prev) return
            s!.el = next
            if (next) {
                // On open: capture the trigger and pull focus into the sheet so
                // keyboard/SR users don't land on the inert list underneath.
                if (
                    !s!.trigger &&
                    document.activeElement instanceof HTMLElement
                )
                    s!.trigger = document.activeElement
                next.querySelector<HTMLElement>(
                    'button:not([disabled])',
                )?.focus()
            } else {
                // On close (element removed): restore focus to the trigger.
                const trigger = s!.trigger
                s!.trigger = null
                if (trigger && trigger.isConnected) trigger.focus()
            }
        }
        overlayStates.set(ctx, s)
    }
    return s
}

export function uploaderPanel(ctx: UploaderContext): TemplateResult {
    const o = ctx.orchestrator.getSnapshot()
    const isDark = ctx.theme.getSnapshot().isDark
    const tr = ctx.translations
    const dd = ctx.controllers.dragDrop.getSnapshot()
    const tui = ctx.getTransientUi()
    const motionMode = ctx.getMotionMode()
    const filesSize = o.files.size
    const activeSource = o.activeSource
    const isOnline = o.isOnline
    const { mini, showBranding } = ctx.props
    const { sourceOverlayOpen, sourceOverlayClosing, dropRejected } = tui

    // The dashed dropzone frame is the idle-view affordance: shown only when the
    // panel is an empty, at-rest dropzone (no active source, no add-more flow, no
    // files). It supersedes the old pulsing CSS border.
    const showDropzoneFrame =
        dd.absoluteHasBorder &&
        !activeSource &&
        !sourceOverlayOpen &&
        !filesSize

    // The add-more overlay: once files exist, the source surface slides up over
    // the still-mounted, dimmed file list. With no files the same surface is the
    // panel's primary content instead. Stays mounted through the close-slide.
    const hasFiles = filesSize > 0
    const sourceSurface = activeSource ? sourceView(ctx) : sourceSelector(ctx)
    const showSourceOverlay =
        hasFiles &&
        (sourceOverlayOpen || sourceOverlayClosing || !!activeSource)

    const uploadAnnouncement =
        o.uploadStatus === UploadStatus.UPLOADING
            ? tr.announceUploadStarted
            : o.uploadStatus === UploadStatus.SUCCESSFUL
              ? tr.announceUploadComplete
              : o.uploadStatus === UploadStatus.FAILED
                ? tr.announceUploadFailed
                : ''

    const os = getOverlayState(ctx)

    return html`
        <div
            data-testid="upup-dropzone"
            data-upup-slot="uploader-panel"
            data-motion=${motionMode}
            role="region"
            aria-label=${tr.dropzoneLabel}
            aria-dropeffect=${dd.isDragging ? 'copy' : 'none'}
            @dragover=${(e: DragEvent) => {
                ctx.controllers.dragDrop.handleDragOver(e)
            }}
            @dragleave=${(e: DragEvent) => {
                ctx.controllers.dragDrop.handleDragLeave(e)
            }}
            @drop=${(e: DragEvent) => ctx.controllers.dragDrop.handleDrop(e)}
            @paste=${(e: ClipboardEvent) => {
                ctx.controllers.dragDrop.handlePaste(e)
            }}
            class=${cn(
                'upup-relative upup-flex upup-flex-1 upup-flex-col upup-overflow-hidden upup-rounded-lg',
                {
                    'upup-border upup-border-[#0ea5e9]':
                        dd.absoluteHasBorder && !showDropzoneFrame,
                    'upup-border-[#38bdf8] dark:upup-border-[#38bdf8]':
                        dd.absoluteHasBorder && !showDropzoneFrame && isDark,
                    'upup-border-dashed': !dd.isDragging && !showDropzoneFrame,
                    'upup-bg-[#e0f2fe] upup-backdrop-blur-sm':
                        dd.absoluteIsDragging && !isDark,
                    'upup-bg-[#0b2a3a] upup-backdrop-blur-sm dark:upup-bg-[#0b2a3a]':
                        dd.absoluteIsDragging && isDark,
                },
            )}
        >
            <div role="status" aria-live="polite" class="upup-sr-only">
                ${uploadAnnouncement}
            </div>
            ${
                dropRejected
                    ? html`<div
                          data-testid="upup-drop-rejected-toast"
                          data-upup-slot="drop-rejected-toast"
                          role="status"
                          aria-live="polite"
                          class=${cn(
                              'upup-animate-informer-in upup-absolute upup-inset-x-4 upup-top-4 upup-z-30 upup-flex upup-items-center upup-gap-2.5 upup-rounded-xl upup-px-3.5 upup-py-2.5 upup-text-[13px] upup-leading-snug upup-ring-1',
                              isDark
                                  ? 'upup-bg-rose-500/[0.14] upup-text-rose-200 upup-ring-rose-400/30'
                                  : 'upup-bg-rose-50 upup-text-rose-700 upup-ring-rose-300/60',
                          )}
                      >
                          <svg
                              viewBox="0 0 24 24"
                              width="16"
                              height="16"
                              fill="none"
                              stroke="currentColor"
                              stroke-width="1.9"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              aria-hidden="true"
                              class="upup-flex-none"
                          >
                              <circle cx="12" cy="12" r="9" />
                              <path d="M12 8v4" />
                              <path d="M12 16h.01" />
                          </svg>
                          <span>
                              ${formatUiMessage(tr.dropRejected, {
                                  provider: dropRejected,
                              })}
                          </span>
                      </div>`
                    : nothing
            }
            ${
                !isOnline
                    ? html`<div
                          class=${cn(
                              'upup-absolute upup-inset-x-0 upup-top-0 upup-z-30 upup-px-3 upup-py-1.5 upup-text-center upup-text-xs upup-font-medium upup-text-white upup-bg-yellow-500',
                              { 'upup-bg-yellow-600': isDark },
                          )}
                      >
                          No internet connection — uploads will resume when you
                          reconnect.
                      </div>`
                    : nothing
            }
            ${
                showDropzoneFrame
                    ? html`<svg
                          data-upup-slot="dropzone-frame"
                          aria-hidden="true"
                          class="upup-pointer-events-none upup-absolute upup-inset-1 upup-h-[calc(100%-0.5rem)] upup-w-[calc(100%-0.5rem)]"
                      >
                          <rect
                              x="1"
                              y="1"
                              rx="14"
                              ry="14"
                              fill="none"
                              stroke-width="1.5"
                              stroke-dasharray="5 7"
                              stroke=${
                                  isDark
                                      ? dd.absoluteIsDragging
                                          ? 'rgba(56,189,248,0.65)'
                                          : 'rgba(56,189,248,0.35)'
                                      : dd.absoluteIsDragging
                                        ? 'rgba(2,132,199,0.7)'
                                        : 'rgba(2,132,199,0.4)'
                              }
                              class=${cn(
                                  dd.absoluteIsDragging &&
                                      'upup-animate-fx-dash-march',
                              )}
                              style="width: calc(100% - 2px); height: calc(100% - 2px);"
                          />
                      </svg>`
                    : nothing
            }
            ${
                dd.absoluteIsDragging
                    ? html`<div
                          data-testid="upup-drag-overlay"
                          data-upup-slot="drag-overlay"
                          aria-hidden="true"
                          class=${cn(
                              'upup-animate-fx-view upup-pointer-events-none upup-absolute upup-inset-0 upup-z-10 upup-flex upup-flex-col upup-items-center upup-justify-center upup-gap-3',
                              isDark
                                  ? 'upup-bg-[#0b1220]/70'
                                  : 'upup-bg-white/70',
                          )}
                      >
                          <span
                              class=${cn(
                                  'upup-flex upup-h-16 upup-w-16 upup-items-center upup-justify-center upup-rounded-2xl',
                                  isDark
                                      ? 'upup-bg-[#38bdf8]/15 upup-text-[#38bdf8]'
                                      : 'upup-bg-[#0284c7]/10 upup-text-[#0284c7]',
                              )}
                          >
                              <svg
                                  viewBox="0 0 24 24"
                                  width="30"
                                  height="30"
                                  fill="none"
                                  stroke="currentColor"
                                  stroke-width="1.8"
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                                  aria-hidden="true"
                              >
                                  <path d="M12 4v11" />
                                  <path d="m7 10 5 5 5-5" />
                                  <path
                                      d="M4 17v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1"
                                  />
                              </svg>
                          </span>
                          <span
                              class=${cn(
                                  'upup-text-[15px] upup-font-semibold',
                                  isDark
                                      ? 'upup-text-[#e2e8f0]'
                                      : 'upup-text-[#0f172a]',
                              )}
                          >
                              ${tr.dropToUpload}
                          </span>
                      </div>`
                    : nothing
            }
            <div
                class="upup-relative upup-flex upup-min-h-0 upup-flex-1 upup-flex-col"
            >
                ${!hasFiles ? sourceSurface : nothing} ${fileList(ctx)}
            </div>
            ${
                showSourceOverlay
                    ? html`<div
                          ${ref(os.refCb)}
                          data-upup-slot="source-overlay"
                          role=${sourceOverlayClosing ? nothing : 'dialog'}
                          aria-modal=${sourceOverlayClosing ? nothing : 'true'}
                          aria-label=${tr.addingMoreFiles}
                          @keydown=${(e: KeyboardEvent) => {
                              if (e.key === 'Escape' && !sourceOverlayClosing)
                                  ctx.closeSourceOverlay()
                          }}
                          class=${cn(
                              'upup-absolute upup-inset-x-3 upup-bottom-3 upup-top-11 upup-z-20 upup-flex upup-flex-col upup-overflow-hidden upup-rounded-2xl upup-ring-1 upup-ring-inset upup-backdrop-blur-md',
                              sourceOverlayClosing
                                  ? 'upup-fx-overlay-close-slide upup-pointer-events-none'
                                  : 'upup-fx-overlay-slide',
                              isDark
                                  ? 'upup-bg-[#0b1220]/[0.85] upup-ring-white/[0.08] upup-shadow-[0_-18px_40px_-18px_rgba(0,0,0,0.65)]'
                                  : 'upup-bg-white/[0.85] upup-ring-black/[0.08] upup-shadow-[0_-18px_40px_-18px_rgba(15,23,42,0.25)]',
                          )}
                      >
                          <button
                              type="button"
                              data-testid="upup-sheet-grip"
                              data-upup-slot="sheet-grip"
                              aria-label=${tr.overlayBack}
                              @click=${() => {
                                  if (!os.swiped) ctx.closeSourceOverlay()
                                  os.swiped = false
                              }}
                              @pointerdown=${(e: PointerEvent) => {
                                  os.swipeStartY = e.clientY
                                  ;(
                                      e.currentTarget as HTMLElement
                                  ).setPointerCapture(e.pointerId)
                              }}
                              @pointermove=${(e: PointerEvent) => {
                                  const startY = os.swipeStartY
                                  const sheet = os.el
                                  if (startY === null || !sheet) return
                                  const dy = Math.max(0, e.clientY - startY)
                                  sheet.style.transition = 'none'
                                  sheet.style.transform = `translateY(${dy}px)`
                              }}
                              @pointerup=${(e: PointerEvent) => {
                                  const startY = os.swipeStartY
                                  const sheet = os.el
                                  os.swipeStartY = null
                                  if (startY === null || !sheet) return
                                  const dy = Math.max(0, e.clientY - startY)
                                  sheet.style.transition = ''
                                  sheet.style.transform = ''
                                  if (dy > 72) {
                                      os.swiped = true
                                      ctx.closeSourceOverlay()
                                  }
                              }}
                              class="upup-absolute upup-left-1/2 upup-top-1.5 upup-z-10 upup-flex upup-h-6 upup-w-20 upup--translate-x-1/2 upup-cursor-grab upup-touch-none upup-items-center upup-justify-center upup-rounded-full"
                          >
                              <span
                                  aria-hidden="true"
                                  class=${cn(
                                      'upup-h-1 upup-w-10 upup-rounded-full',
                                      isDark
                                          ? 'upup-bg-white/20'
                                          : 'upup-bg-black/20',
                                  )}
                              ></span>
                          </button>
                          ${sourceSurface}
                      </div>`
                    : nothing
            }
            ${
                !mini && showBranding && !activeSource && !hasFiles
                    ? html`<div
                          data-testid="upup-branding"
                          class="upup-flex upup-w-full upup-flex-none upup-flex-col upup-items-center upup-justify-between upup-gap-1 upup-px-6 upup-pb-5 upup-pt-1.5 md:upup-flex-row"
                      >
                          <a
                              href="https://useupup.com/"
                              target="_blank"
                              rel="noopener noreferrer"
                              class="upup-flex upup-items-center upup-gap-[5px]"
                          >
                              ${
                                  isDark
                                      ? html`<img
                                            src=${logoDark}
                                            width="61"
                                            height="13"
                                            alt="logo-dark"
                                        />`
                                      : html`<img
                                            src=${logoLight}
                                            width="61"
                                            height="13"
                                            alt="logo-light"
                                        />`
                              }
                          </a>
                          <a
                              href="https://devino.ca/"
                              target="_blank"
                              rel="noopener noreferrer"
                              class="upup-flex upup-flex-row upup-items-center upup-justify-end upup-gap-1"
                          >
                              <span
                                  class=${cn(
                                      'upup-mr-0.5 upup-text-xs upup-leading-5 upup-text-[#6D6D6D] md:upup-text-sm',
                                      {
                                          'upup-text-gray-300 dark:upup-text-gray-300':
                                              isDark,
                                      },
                                  )}
                                  >${tr.builtBy}
                              </span>
                              ${
                                  isDark
                                      ? html`<img
                                            src=${devinoDark}
                                            width="61"
                                            height="13"
                                            alt="logo-dark"
                                        />`
                                      : html`<img
                                            src=${devinoLight}
                                            width="61"
                                            height="13"
                                            alt="logo-light"
                                        />`
                              }
                          </a>
                      </div>`
                    : nothing
            }
        </div>
    `
}
