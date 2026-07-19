import { html, nothing, type TemplateResult } from 'lit-html'
import { repeat } from 'lit-html/directives/repeat.js'
import {
    formatUiMessage as t,
    pluralUiMessage as plural,
    FileSource,
} from '@upupjs/core'
import { cn } from '../lib/cn'
import type { UploaderContext } from '../lib/types'
import { uploadSourceObject } from '../lib/constants'
import { icon } from './icon'

export function sourceSelector(ctx: UploaderContext): TemplateResult {
    const isDark = ctx.theme.getSnapshot().isDark
    const slot = ctx.theme.getSnapshot().slotOverrides
    const tr = ctx.translations
    const mini = ctx.props.mini
    const allowedFileTypes = ctx.props.allowedFileTypes
    const limit = ctx.props.limit
    const maxFileSize = ctx.props.maxFileSize
    const folderPickerButtonVisible = ctx.props.folderPickerButtonVisible

    // Idle limits caption (data-upup-slot="limits-caption"): iconified file-count
    // and per-file size limits, plus a leading text-only type-restriction segment
    // so no constraint the consumer configured is dropped.
    const typeConstraint = (() => {
        if (
            allowedFileTypes &&
            allowedFileTypes !== '*/*' &&
            allowedFileTypes !== '*'
        ) {
            const humanized = allowedFileTypes
                .split(',')
                .map(s => s.trim())
                .map(m => {
                    if (m.startsWith('.')) return m
                    const [type, sub] = m.split('/')
                    if (!type || !sub) return m
                    if (sub === '*')
                        return (
                            type.charAt(0).toUpperCase() + type.slice(1) + 's'
                        )
                    return sub.toUpperCase()
                })
                .join(', ')
            return humanized + ' only'
        }
        return null
    })()
    const showFilesLimit = limit > 1
    const showSizeLimit = !!(maxFileSize?.size && maxFileSize?.unit)
    const hasLimitsCaption = !!typeConstraint || showFilesLimit || showSizeLimit

    // chosenSources: mirror useSourceSelector composable
    const chosenSources = Object.values(uploadSourceObject)
        .filter(item => ctx.props.sources.includes(item.id))
        .map(item => ({ ...item, name: tr[item.nameKey] }))

    function handleSourceClick(sourceId: FileSource) {
        ctx.props.onIntegrationClick(sourceId)
        ctx.core.emit('source-click', { sourceId })
        if (sourceId === FileSource.LOCAL) ctx.openFilePicker()
        else ctx.setActiveSource(sourceId)
    }

    function handleBrowseFilesClick() {
        const el = ctx.getFileInput()
        if (el) {
            el.removeAttribute('webkitdirectory')
            el.removeAttribute('directory')
        }
        ctx.openFilePicker()
        ctx.core.emit('browse-files', {})
    }

    async function handleSelectFolderClick() {
        const fsWindow = window as Window & {
            showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>
        }
        if (fsWindow.showDirectoryPicker) {
            try {
                const directoryHandle = await fsWindow.showDirectoryPicker()
                const collectedFiles: File[] = []
                type IterableDirHandle = {
                    values(): AsyncIterableIterator<
                        FileSystemHandle & {
                            kind: string
                            getFile: () => Promise<File>
                        }
                    >
                }
                async function getFiles(
                    dirHandle: IterableDirHandle,
                    path = '',
                ) {
                    for await (const entry of dirHandle.values()) {
                        const newPath = path
                            ? `${path}/${entry.name}`
                            : entry.name
                        if (entry.kind === 'file') {
                            const pickedFile = await entry.getFile()
                            const file = new File(
                                [await pickedFile.arrayBuffer()],
                                pickedFile.name,
                                {
                                    type: pickedFile.type,
                                    lastModified: pickedFile.lastModified,
                                },
                            )
                            try {
                                Object.defineProperty(
                                    file,
                                    'webkitRelativePath',
                                    {
                                        value: newPath,
                                        configurable: true,
                                        writable: true,
                                    },
                                )
                                Object.defineProperty(file, 'relativePath', {
                                    value: newPath,
                                    configurable: true,
                                    writable: true,
                                })
                            } catch {
                                // upup-catch: defineProperty unsupported here — fall back to a plain assign
                                Object.assign(file, { relativePath: newPath })
                            }
                            collectedFiles.push(file)
                        } else if (entry.kind === 'directory') {
                            await getFiles(
                                entry as unknown as IterableDirHandle,
                                newPath,
                            )
                        }
                    }
                }
                await getFiles(directoryHandle as unknown as IterableDirHandle)
                if (collectedFiles.length > 0) {
                    void ctx.setFiles(collectedFiles)
                    ctx.core.emit('folder-select', {
                        count: collectedFiles.length,
                    })
                    const el = ctx.getFileInput()
                    if (el) el.value = ''
                }
            } catch (error) {
                const name = error instanceof DOMException ? error.name : ''
                if (name !== 'AbortError') throw error
            }
        } else {
            const el = ctx.getFileInput()
            if (el) {
                el.setAttribute('webkitdirectory', 'true')
                el.setAttribute('directory', 'true')
            }
            ctx.openFilePicker()
            ctx.core.emit('folder-select', { count: 0 })
        }
    }

    return html`
        <div
            data-testid="upup-source-selector"
            data-upup-slot="source-selector"
            class="upup-animate-fx-view upup-relative upup-flex upup-h-full upup-flex-col upup-items-center upup-justify-center upup-gap-6 upup-rounded-lg upup-px-4 upup-py-6"
        >
            ${
                !mini
                    ? html`
                          <div
                              class=${cn(
                                  'upup-flex upup-flex-wrap upup-items-center upup-justify-center upup-gap-x-1.5 upup-gap-y-1 upup-px-2 upup-text-center upup-text-base upup-font-medium md:upup-text-lg',
                                  {
                                      'upup-text-[#242634]': !isDark,
                                      'upup-text-[#e2e8f0] dark:upup-text-[#e2e8f0]':
                                          isDark,
                                  },
                              )}
                          >
                              <span>${tr.dropFilesHere}</span>
                              <button
                                  type="button"
                                  data-testid="upup-browse-files"
                                  class=${cn(
                                      'upup-cursor-pointer upup-rounded upup-font-semibold focus-visible:upup-outline-none focus-visible:upup-ring-2 focus-visible:upup-ring-[#38bdf8]',
                                      {
                                          'upup-text-[#0284c7]': !isDark,
                                          'upup-text-[#38bdf8] dark:upup-text-[#38bdf8]':
                                              isDark,
                                      },
                                  )}
                                  @click=${handleBrowseFilesClick}
                              >
                                  ${tr.browseFiles}
                              </button>
                              ${
                                  folderPickerButtonVisible
                                      ? html`<span>${tr.or}</span>
                                            <button
                                                type="button"
                                                class=${cn(
                                                    'upup-cursor-pointer upup-rounded upup-font-semibold focus-visible:upup-outline-none focus-visible:upup-ring-2 focus-visible:upup-ring-[#38bdf8]',
                                                    {
                                                        'upup-text-[#0284c7]':
                                                            !isDark,
                                                        'upup-text-[#38bdf8] dark:upup-text-[#38bdf8]':
                                                            isDark,
                                                    },
                                                )}
                                                @click=${handleSelectFolderClick}
                                            >
                                                ${tr.selectAFolder}
                                            </button>`
                                      : nothing
                              }
                              <span>${tr.orImportFrom}</span>
                          </div>
                          <div
                              class=${cn(
                                  'upup-flex upup-max-w-[420px] upup-flex-wrap upup-items-start upup-justify-center upup-gap-x-6 upup-gap-y-5',
                                  slot.sourceButtonList,
                              )}
                          >
                              ${repeat(
                                  chosenSources,
                                  s => s.id,
                                  ({ Icon, id, name }) => html`
                                      <button
                                          type="button"
                                          data-testid=${`upup-source-${id}`}
                                          class=${cn(
                                              'upup-fx-hover-lift upup-fx-press upup-fx-icon-nudge upup-group upup-flex upup-w-[66px] upup-cursor-pointer upup-flex-col upup-items-center upup-gap-[9px] upup-rounded-[14px] focus-visible:upup-outline-none focus-visible:upup-ring-2 focus-visible:upup-ring-[#38bdf8] hover:upup-shadow-none',
                                              slot.sourceButton,
                                          )}
                                          @click=${() => {
                                              handleSourceClick(id)
                                          }}
                                      >
                                          <span
                                              class=${cn(
                                                  'upup-flex upup-h-[52px] upup-w-[52px] upup-items-center upup-justify-center upup-rounded-[14px] upup-ring-1 upup-transition-colors',
                                                  {
                                                      'upup-bg-white upup-ring-black/[0.07] group-hover:upup-bg-slate-50':
                                                          !isDark,
                                                      'upup-bg-white/[0.055] upup-ring-white/[0.06] group-hover:upup-bg-white/[0.09] dark:upup-bg-white/[0.055] dark:upup-ring-white/[0.06]':
                                                          isDark,
                                                  },
                                              )}
                                          >
                                              ${Icon({
                                                  class: cn(
                                                      'upup-h-10 upup-w-10',
                                                      slot.sourceButtonIcon,
                                                  ),
                                              })}
                                          </span>
                                          <span
                                              class=${cn(
                                                  'upup-text-xs upup-leading-none',
                                                  {
                                                      'upup-text-[#6D6D6D]':
                                                          !isDark,
                                                      'upup-text-[#94a3b8] dark:upup-text-[#94a3b8]':
                                                          isDark,
                                                  },
                                                  slot.sourceButtonText,
                                              )}
                                          >
                                              ${name}
                                          </span>
                                      </button>
                                  `,
                              )}
                          </div>
                      `
                    : nothing
            }
            ${
                mini
                    ? html`
                          <button
                              type="button"
                              @click=${handleBrowseFilesClick}
                              class="upup-flex upup-cursor-pointer upup-flex-col upup-items-center upup-justify-center upup-gap-2 upup-rounded-lg upup-p-2"
                          >
                              ${icon('upload', {
                                  size: 32,
                                  class: cn(
                                      'upup-h-16 upup-w-16 md:upup-h-20 md:upup-w-20',
                                      {
                                          'upup-text-[#0B0B0B]': !isDark,
                                          'upup-text-white dark:upup-text-white':
                                              isDark,
                                      },
                                  ),
                              })}
                              <p
                                  class=${cn(
                                      'px-6 upup-text-center upup-text-xs',
                                      {
                                          'upup-text-[#6D6D6D] dark:upup-text-gray-400':
                                              !isDark,
                                          'upup-text-gray-400 dark:upup-text-gray-500':
                                              isDark,
                                      },
                                  )}
                              >
                                  Drag or browse to upload
                              </p>
                          </button>
                      `
                    : hasLimitsCaption
                      ? html`
                            <div
                                data-upup-slot="limits-caption"
                                class=${cn(
                                    'upup-flex upup-flex-wrap upup-items-center upup-justify-center upup-gap-x-2.5 upup-gap-y-1 upup-px-3 upup-text-center upup-text-xs',
                                    {
                                        'upup-text-[#6D6D6D]': !isDark,
                                        'upup-text-[#94a3b8] dark:upup-text-[#94a3b8]':
                                            isDark,
                                    },
                                )}
                            >
                                ${
                                    typeConstraint
                                        ? html`<span>${typeConstraint}</span>`
                                        : nothing
                                }
                                ${
                                    typeConstraint &&
                                    (showFilesLimit || showSizeLimit)
                                        ? html`<span aria-hidden="true"
                                              >&middot;</span
                                          >`
                                        : nothing
                                }
                                ${
                                    showFilesLimit
                                        ? html`<span
                                              class="upup-inline-flex upup-items-center upup-gap-1.5"
                                          >
                                              <span
                                                  aria-hidden="true"
                                                  class="upup-inline-flex"
                                              >
                                                  ${icon('stacked-files', {
                                                      class: 'upup-h-4 upup-w-4',
                                                  })}
                                              </span>
                                              ${t(
                                                  plural(tr, 'filesMax', limit),
                                                  { count: limit },
                                              )}
                                          </span>`
                                        : nothing
                                }
                                ${
                                    showFilesLimit && showSizeLimit
                                        ? html`<span aria-hidden="true"
                                              >&middot;</span
                                          >`
                                        : nothing
                                }
                                ${
                                    showSizeLimit
                                        ? html`<span
                                              class="upup-inline-flex upup-items-center upup-gap-1.5"
                                          >
                                              <span
                                                  aria-hidden="true"
                                                  class="upup-inline-flex"
                                              >
                                                  ${icon('storage', {
                                                      class: 'upup-h-4 upup-w-4',
                                                  })}
                                              </span>
                                              ${t(tr.sizeEach, {
                                                  size: maxFileSize?.size ?? 0,
                                                  unit: maxFileSize?.unit ?? '',
                                              })}
                                          </span>`
                                        : nothing
                                }
                            </div>
                        `
                      : nothing
            }
        </div>
    `
}
