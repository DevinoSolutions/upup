import { html, nothing, type TemplateResult } from 'lit-html'
import { repeat } from 'lit-html/directives/repeat.js'
import {
    formatUiMessage as t,
    pluralUiMessage as plural,
    FileSource,
} from '@upupjs/core'
import { cn } from '@upupjs/core/internal'
import type { UploaderContext } from '../lib/types'
import { uploadSourceObject } from '../lib/constants'
import { icon } from './icon'

export function sourceSelector(ctx: UploaderContext): TemplateResult {
    const isDark = ctx.theme.getSnapshot().isDark
    const slot = ctx.theme.getSnapshot().slotOverrides
    const tr = ctx.translations
    const isAddingMore = ctx.orchestrator.getSnapshot().isAddingMore
    const filesSize = ctx.orchestrator.getSnapshot().files.size
    const mini = ctx.props.mini
    const allowedFileTypes = ctx.props.allowedFileTypes
    const limit = ctx.props.limit
    const maxFileSize = ctx.props.maxFileSize
    const folderPickerButtonVisible = ctx.props.folderPickerButtonVisible

    // Build constraint line (mirrors svelte SourceSelector:8-30, SourceSelector.svelte)
    const constraintLine = (() => {
        const parts: string[] = []
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
                    if (type === undefined || sub === undefined) return m
                    if (sub === '*')
                        return (
                            type.charAt(0).toUpperCase() + type.slice(1) + 's'
                        )
                    return sub.toUpperCase()
                })
                .join(', ')
            // svelte SourceSelector.svelte:L19 hardcodes " only" — not a translation key
            parts.push(humanized + ' only')
        }
        if (limit > 1) {
            parts.push(t(tr.addDocumentsHere, { limit }))
        }
        if (maxFileSize?.size) {
            parts.push(
                t(plural(tr, 'maxFileSizeAllowed', limit), {
                    size: maxFileSize.size,
                    unit: maxFileSize.unit,
                }),
            )
        }
        return parts.join(', ')
    })()

    // chosenSources: mirror svelte useSourceSelector composable
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
                        } else {
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
            class=${cn(
                'upup-relative upup-flex upup-h-full upup-gap-3 upup-rounded-lg',
                {
                    'upup-flex-col': isAddingMore,
                    'upup-flex-col-reverse upup-items-center upup-justify-center md:upup-flex-col md:upup-gap-14':
                        !isAddingMore,
                },
            )}
        >
            ${
                isAddingMore
                    ? html`
                          <div
                              class=${cn(
                                  'upup-shadow-bottom upup-flex upup-w-full upup-items-center upup-rounded-t-lg upup-bg-black/[0.025] upup-px-3 upup-py-2',
                                  {
                                      'upup-bg-white/5 dark:upup-bg-white/5':
                                          isDark,
                                  },
                                  slot.containerHeader,
                              )}
                          >
                              <button
                                  class=${cn(
                                      'upup-flex upup-items-center upup-gap-1 upup-text-sm upup-font-medium upup-text-[#0284c7]',
                                      {
                                          'upup-text-[#38bdf8] dark:upup-text-[#38bdf8]':
                                              isDark,
                                      },
                                      slot.containerCancelButton,
                                  )}
                                  @click=${() => {
                                      ctx.setIsAddingMore(false)
                                  }}
                              >
                                  <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      width="16"
                                      height="16"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      stroke-width="2"
                                      stroke-linecap="round"
                                      stroke-linejoin="round"
                                  >
                                      <polyline points="15 18 9 12 15 6" />
                                  </svg>
                                  Back
                              </button>
                              <span
                                  class=${cn(
                                      'upup-flex-1 upup-text-center upup-text-sm upup-text-[#6D6D6D]',
                                      {
                                          'upup-text-gray-300 dark:upup-text-gray-300':
                                              isDark,
                                      },
                                  )}
                              >
                                  Adding more files
                              </span>
                          </div>
                      `
                    : nothing
            }
            ${
                !mini
                    ? html`
                          <div
                              class=${cn(
                                  'upup-flex upup-w-full upup-flex-col upup-justify-center upup-gap-1 md:upup-flex-row md:upup-flex-wrap md:upup-items-center md:upup-gap-[30px] md:upup-px-[30px]',
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
                                              'upup-group upup-flex upup-items-center upup-gap-[6px] upup-border-b upup-border-gray-200 upup-px-2 upup-py-1 md:upup-flex-col md:upup-justify-center md:upup-rounded-lg md:upup-border-none md:upup-p-0',
                                              {
                                                  'upup-border-[#6D6D6D] dark:upup-border-[#6D6D6D]':
                                                      isDark,
                                              },
                                              slot.sourceButton,
                                          )}
                                          @click=${() => {
                                              handleSourceClick(id)
                                          }}
                                      >
                                          ${Icon(slot.sourceButtonIcon ? { class: slot.sourceButtonIcon } : {})}
                                          <span
                                              class=${cn(
                                                  'upup-text-xs upup-text-[#242634]',
                                                  {
                                                      'upup-text-gray-300 dark:upup-text-gray-300':
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
                                          // Idle drag-drop hint (mini): gently bob
                                          // the upload glyph while empty and at rest.
                                          // Transform-only, so no layout shift;
                                          // paused once files are selected or the
                                          // add-more flow is active.
                                          'upup-animate-hint-bob motion-reduce:upup-animate-none':
                                              !filesSize && !isAddingMore,
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
                    : html`
                          <div
                              class="upup-flex upup-flex-col upup-items-center upup-gap-1 upup-px-3 upup-text-center md:upup-gap-2 md:upup-px-[30px]"
                          >
                              <div
                                  class="upup-flex upup-flex-wrap upup-items-center upup-justify-center upup-gap-1"
                              >
                                  <span
                                      class=${cn(
                                          'upup-text-xs upup-text-[#0B0B0B] md:upup-text-sm',
                                          {
                                              'upup-text-white dark:upup-text-white':
                                                  isDark,
                                          },
                                      )}
                                  >
                                      ${limit > 1 ? tr.dragFilesOr : tr.dragFileOr}
                                  </span>
                                  <button
                                      type="button"
                                      data-testid="upup-browse-files"
                                      class=${cn(
                                          'upup-cursor-pointer upup-text-xs upup-font-semibold upup-text-[#0284c7] md:upup-text-sm',
                                          {
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
                                          ? html`
                                                <span
                                                    class=${cn(
                                                        'upup-text-xs upup-text-[#0B0B0B] md:upup-text-sm',
                                                        {
                                                            'upup-text-white dark:upup-text-white':
                                                                isDark,
                                                        },
                                                    )}
                                                >
                                                    ${' '}${tr.or}
                                                </span>
                                                <button
                                                    type="button"
                                                    class=${cn(
                                                        'upup-cursor-pointer upup-text-xs upup-font-semibold upup-text-[#0284c7] md:upup-text-sm',
                                                        {
                                                            'upup-text-[#38bdf8] dark:upup-text-[#38bdf8]':
                                                                isDark,
                                                        },
                                                    )}
                                                    @click=${handleSelectFolderClick}
                                                >
                                                    ${tr.selectAFolder}
                                                </button>
                                            `
                                          : nothing
                                  }
                              </div>
                              ${
                                  constraintLine
                                      ? html`
                                            <p
                                                class=${cn(
                                                    'upup-text-center upup-text-xs upup-text-[#6D6D6D] md:upup-text-sm',
                                                    {
                                                        'upup-text-gray-300 dark:upup-text-gray-300':
                                                            isDark,
                                                    },
                                                )}
                                            >
                                                ${constraintLine}
                                            </p>
                                        `
                                      : nothing
                              }
                          </div>
                      `
            }
        </div>
    `
}
