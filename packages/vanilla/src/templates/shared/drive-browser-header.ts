import { html, nothing } from 'lit-html'
import { repeat } from 'lit-html/directives/repeat.js'
import { cn } from '@upup/core'
import type { DriveFolder } from '@upup/core'
import type { UploaderContext } from '../../lib/types'
import { icon } from '../icon'

export function driveBrowserHeader(
    ctx: UploaderContext,
    args: {
        user: { name?: string; email?: string; picture?: string } | undefined
        path: DriveFolder[]
        setPath: (p: DriveFolder[]) => void
        handleSignOut: () => void | Promise<void>
        onSearch: (value: string) => void
        searchTerm: string
        showSearch: boolean
    },
) {
    const {
        user,
        path,
        setPath,
        handleSignOut,
        onSearch,
        searchTerm,
        showSearch,
    } = args
    if (!user) return nothing

    const isDark = ctx.theme.getSnapshot().isDark
    const slot = ctx.theme.getSnapshot().slotOverrides
    const tr = ctx.translations

    return html` <div data-upup-slot="drive-browser-header">
        <div
            class=${cn(
                'upup-shadow-bottom upup-grid upup-grid-cols-[1fr,auto] upup-bg-black/[0.025] upup-px-3 upup-py-2 upup-text-xs upup-font-medium upup-text-[#333]',
                {
                    'upup-bg-white/5 upup-text-[#FAFAFA] dark:upup-bg-white/5 dark:upup-text-[#FAFAFA]':
                        isDark,
                },
                slot.driveHeader,
            )}
        >
            ${path.length > 0
                ? html` <div class="upup-flex upup-items-center upup-gap-1">
                      ${repeat(
                          path,
                          p => p.id,
                          (p, i) =>
                              html` <p
                                  class=${cn(
                                      'upup-group upup-flex upup-shrink-0 upup-cursor-pointer upup-gap-1 upup-truncate',
                                      {
                                          'upup-text-[#6D6D6D] dark:upup-text-[#6D6D6D]':
                                              isDark,
                                      },
                                  )}
                                  style="max-width: ${100 /
                                  path.length}%; pointer-events: ${i ===
                                  path.length - 1
                                      ? 'none'
                                      : 'auto'}"
                                  @click=${() => setPath(path.slice(0, i + 1))}
                              >
                                  <span
                                      class="upup-group-hover:upup-underline upup-truncate"
                                      >${p.name}</span
                                  >
                                  ${i !== path.length - 1
                                      ? html` &gt; `
                                      : nothing}
                              </p>`,
                      )}
                  </div>`
                : nothing}
            <div class="upup-flex upup-items-center upup-gap-2">
                <div
                    class="upup-relative upup-flex upup-h-8 upup-w-8 upup-items-center upup-justify-center upup-overflow-hidden upup-rounded-full"
                >
                    ${user.picture
                        ? html`<img
                              alt=${user.name ?? ''}
                              src=${user.picture}
                              class="upup-bg-center upup-object-cover"
                          />`
                        : html`${icon('user', { class: 'upup-text-xl' })}`}
                </div>
                <button
                    class=${cn(
                        'upup-hover:upup-underline upup-text-blue-600',
                        {
                            'upup-text-[#30C5F7] dark:upup-text-[#30C5F7]':
                                isDark,
                        },
                        slot.driveLogoutButton,
                    )}
                    @click=${() => {
                        void handleSignOut()
                        ctx.setActiveSource(undefined)
                    }}
                >
                    ${tr.logOut}
                </button>
            </div>
        </div>

        ${showSearch
            ? html` <div
                  class=${cn(
                      'upup-relative upup-h-fit upup-bg-black/[0.025] upup-px-3 upup-py-2',
                      {
                          'upup-bg-white/5 upup-text-[#fafafa] dark:upup-bg-white/5 dark:upup-text-[#fafafa]':
                              isDark,
                      },
                      slot.driveSearchContainer,
                  )}
              >
                  <input
                      type="search"
                      name="upup-drive-search"
                      aria-label=${tr.search}
                      class=${cn(
                          'upup-h-fit upup-w-full upup-rounded-md upup-bg-black/[0.025] upup-px-3 upup-py-2 upup-pl-8 upup-text-xs upup-outline-none upup-transition-all upup-duration-300',
                          {
                              'upup-bg-white/5 upup-text-[#6D6D6D] dark:upup-bg-white/5 dark:upup-text-[#6D6D6D]':
                                  isDark,
                          },
                          slot.driveSearchInput,
                      )}
                      placeholder=${tr.search}
                      .value=${searchTerm}
                      @input=${(e: Event) => {
                          onSearch((e.target as HTMLInputElement).value)
                      }}
                  />
                  ${icon('search', {
                      class: 'upup-absolute upup-left-5 upup-top-1/2 upup--translate-y-1/2 upup-text-[#939393]',
                  })}
              </div>`
            : nothing}
    </div>`
}
