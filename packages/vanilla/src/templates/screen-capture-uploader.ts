import { html, nothing, type TemplateResult } from 'lit-html'
import { ref } from 'lit-html/directives/ref.js'
import { cn } from '@upupjs/core/internal'
import type { UploaderContext } from '../lib/types'
import { sourceViewContainer } from './shared/source-view-container'

export function screenCaptureUploader(ctx: UploaderContext): TemplateResult {
    const sc = ctx.controllers.getScreen()
    const s = sc.getSnapshot()
    const isDark = ctx.theme.getSnapshot().isDark

    if (s.error) {
        return sourceViewContainer(
            ctx,
            { dataUpupSlot: 'screen-capture-uploader' },
            html` <div
                class="upup-flex upup-flex-col upup-items-center upup-gap-3 upup-p-6 upup-text-center"
            >
                <p
                    class=${cn('upup-text-sm upup-text-red-500', {
                        'upup-text-red-400': isDark,
                    })}
                >
                    ${s.error}
                </p>
                <button
                    type="button"
                    class=${cn(
                        'upup-rounded-lg upup-bg-[#0ea5e9] upup-px-4 upup-py-2 upup-text-sm upup-font-medium upup-text-white',
                        { 'upup-bg-[#38bdf8] dark:upup-bg-[#38bdf8]': isDark },
                    )}
                    @click=${() => {
                        sc.retryRecording()
                    }}
                >
                    Try Again
                </button>
            </div>`,
        )
    }

    const inner = html` <div
        class="upup-flex upup-h-full upup-w-full upup-flex-col upup-items-center upup-justify-center upup-gap-4 upup-p-4"
    >
        ${
            s.recordingState === 'idle'
                ? html` <div
                      class="upup-flex upup-flex-col upup-items-center upup-gap-4"
                  >
                      <div
                          class="upup-flex upup-h-20 upup-w-20 upup-items-center upup-justify-center upup-rounded-full upup-bg-[#0ea5e9]/20"
                      >
                          <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="32"
                              height="32"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke=${isDark ? '#38bdf8' : '#0284c7'}
                              stroke-width="2"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                          >
                              <rect width="20" height="15" x="2" y="3" rx="2" />
                              <polyline points="8 21 16 21" />
                              <line x1="12" x2="12" y1="18" y2="21" />
                          </svg>
                      </div>
                      <button
                          type="button"
                          class=${cn(
                              'upup-rounded-lg upup-bg-[#0ea5e9] upup-px-6 upup-py-2.5 upup-text-sm upup-font-medium upup-text-white upup-transition-colors hover:upup-bg-[#0284c7]',
                              {
                                  'upup-bg-[#38bdf8] hover:upup-bg-[#0ea5e9] dark:upup-bg-[#38bdf8]':
                                      isDark,
                              },
                          )}
                          @click=${() => void sc.startRecording()}
                      >
                          Share Screen
                      </button>
                  </div>`
                : nothing
        }
        ${
            s.recordingState === 'recording'
                ? html` <div
                          class="upup-relative upup-flex upup-min-h-0 upup-w-full upup-max-w-md upup-flex-1"
                      >
                          <video
                              ${ref(sc.previewRef)}
                              muted
                              class="upup-min-h-0 upup-w-full upup-flex-1 upup-rounded-lg upup-object-contain"
                          ></video>
                          <!-- REC chip (states-tour-3 state E): red dot + label +
                              timer. The dot's pulse is fx-gated (upup-animate-fx-
                              substring) — under motion-off the dot stays static so
                              the recording status remains visible. -->
                          <div
                              data-upup-slot="screen-rec-chip"
                              class="upup-absolute upup-left-2.5 upup-top-2.5 upup-flex upup-items-center upup-gap-1.5 upup-rounded-md upup-bg-[#04080f]/60 upup-px-2 upup-py-1 upup-font-mono upup-text-[11px] upup-tabular-nums upup-text-[#fecdd3]"
                          >
                              <span
                                  class="upup-animate-fx-rec-pulse upup-h-2 upup-w-2 upup-rounded-full upup-bg-red-500"
                              ></span>
                              REC ${sc.formatTime(s.duration)}
                          </div>
                      </div>
                      <button
                          type="button"
                          class="upup-fx-press upup-rounded-lg upup-bg-red-500 upup-px-6 upup-py-2.5 upup-text-sm upup-font-medium upup-text-white upup-transition-colors hover:upup-bg-red-600"
                          @click=${() => {
                              sc.stopRecording()
                          }}
                      >
                          Stop Recording
                      </button>`
                : nothing
        }
        ${
            s.recordingState === 'recorded' && s.videoUrl
                ? html` <video
                          controls
                          src=${s.videoUrl}
                          class="upup-w-full upup-max-w-md upup-min-h-0 upup-flex-1 upup-rounded-lg upup-object-contain"
                      ></video>
                      <div class="upup-flex upup-gap-3">
                          <button
                              type="button"
                              class="upup-rounded-lg upup-bg-gray-500 upup-px-4 upup-py-2.5 upup-text-sm upup-font-medium upup-text-white upup-transition-colors hover:upup-bg-gray-600"
                              @click=${() => {
                                  sc.discardRecording()
                              }}
                          >
                              Discard
                          </button>
                          <button
                              type="button"
                              class=${cn(
                                  'upup-rounded-lg upup-bg-[#0ea5e9] upup-px-4 upup-py-2.5 upup-text-sm upup-font-medium upup-text-white upup-transition-colors hover:upup-bg-[#0284c7]',
                                  {
                                      'upup-bg-[#38bdf8] hover:upup-bg-[#0ea5e9] dark:upup-bg-[#38bdf8]':
                                          isDark,
                                  },
                              )}
                              @click=${() => {
                                  sc.addRecording()
                              }}
                          >
                              Add Recording
                          </button>
                      </div>`
                : nothing
        }
    </div>`

    return sourceViewContainer(
        ctx,
        { dataUpupSlot: 'screen-capture-uploader' },
        inner,
    )
}
