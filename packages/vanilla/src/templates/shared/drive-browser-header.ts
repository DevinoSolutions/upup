import { html, nothing, type TemplateResult } from 'lit-html'
import { ref } from 'lit-html/directives/ref.js'
import { cn } from '@upupjs/core/internal'
import type { DriveFolder } from '@upupjs/core'
import type { UploaderContext } from '../../lib/types'
import { icon } from '../icon'
import { renderHeaderExtra } from '../../context/source-view-header-extra'

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
        searchOpen: boolean
        setSearchOpen: (open: boolean) => void
        focusPending: boolean
        onSearchFocused: () => void
    },
): TemplateResult | typeof nothing {
    const {
        user,
        path,
        setPath,
        handleSignOut,
        onSearch,
        searchTerm,
        showSearch,
        searchOpen,
        setSearchOpen,
        focusPending,
        onSearchFocused,
    } = args

    const isDark = ctx.theme.getSnapshot().isDark
    const slot = ctx.theme.getSnapshot().slotOverrides
    const tr = ctx.translations

    if (!user) {
        // No authenticated user — clear any account controls previously
        // teleported into the SourceView header-extra host.
        renderHeaderExtra(ctx, nothing)
        return nothing
    }

    // Once navigated into a folder we show a Back affordance + the current folder
    // name, not a full breadcrumb trail (long provider folder names blew the row
    // up, and multi-level jumps weren't worth the fragility).
    const navigated = path.length > 1
    const currentFolder = path[path.length - 1]
    const hasFilter = searchTerm.trim().length > 0

    // Account controls live in the SourceView header row (portal), next to Back,
    // separated by a hairline — not in their own strip. Reproduce React's 3
    // sibling nodes (avatar div, log-out button, separator span).
    renderHeaderExtra(
        ctx,
        html`<div
                class="upup-relative upup-flex upup-h-6 upup-w-6 upup-items-center upup-justify-center upup-overflow-hidden upup-rounded-full"
            >
                ${
                    user.picture
                        ? html`<img
                              alt=${user.name ?? ''}
                              src=${user.picture}
                              class="upup-bg-center upup-object-cover"
                          />`
                        : icon('user', { class: 'upup-text-xl' })
                }
            </div>
            <button
                class=${cn(
                    'upup-hover:upup-underline upup-text-xs upup-font-medium upup-text-[#0284c7]',
                    { 'upup-text-[#38bdf8] dark:upup-text-[#38bdf8]': isDark },
                    slot.driveLogoutButton,
                )}
                @click=${() => {
                    void handleSignOut()
                    ctx.setActiveSource(undefined)
                }}
            >
                ${tr.logOut}
            </button>
            <span
                aria-hidden="true"
                class=${cn(
                    'upup-h-4 upup-w-px',
                    isDark ? 'upup-bg-white/15' : 'upup-bg-black/15',
                )}
            ></span>`,
    )

    // Collapsed/expanded search; the term itself stays in DriveBrowser. The
    // expand animation runs only on the navigated form, never at root.
    const searchField = html` <div
        class=${cn(
            'upup-relative upup-min-w-0 upup-flex-1',
            navigated ? 'upup-fx-search-expand' : '',
            slot.driveSearchContainer,
        )}
    >
        <input
            ${ref(el => {
                if (el && focusPending) {
                    onSearchFocused()
                    ;(el as HTMLInputElement).focus()
                }
            })}
            type="search"
            name="upup-drive-search"
            data-testid="upup-drive-search-input"
            data-upup-slot="drive-search-input"
            aria-label=${tr.search}
            class=${cn(
                'upup-w-full upup-rounded-lg upup-px-3 upup-py-1.5 upup-pl-8 upup-text-xs upup-outline-none upup-ring-1 upup-transition-shadow focus:upup-ring-2 focus:upup-ring-[#38bdf8]',
                isDark
                    ? 'upup-bg-white/[0.06] upup-text-[#e2e8f0] upup-ring-white/[0.1] placeholder:upup-text-[#64748b]'
                    : 'upup-bg-white upup-text-[#0f172a] upup-ring-black/[0.08] placeholder:upup-text-[#94a3b8]',
                slot.driveSearchInput,
            )}
            placeholder=${tr.search}
            .value=${searchTerm}
            @input=${(e: Event) => {
                onSearch((e.target as HTMLInputElement).value)
            }}
            @keydown=${(e: KeyboardEvent) => {
                if (e.key === 'Escape') setSearchOpen(false)
            }}
            @blur=${() => {
                // Collapse only when empty — a live filter must stay visible.
                if (!searchTerm) setSearchOpen(false)
            }}
        />
        ${icon('search', {
            class: 'upup-absolute upup-left-2.5 upup-top-1/2 upup--translate-y-1/2 upup-text-[#939393]',
        })}
    </div>`

    return html` <div data-upup-slot="drive-browser-header">
        ${
            showSearch || navigated
                ? html` <div
                      class=${cn(
                          'upup-flex upup-items-center upup-gap-2.5 upup-px-3 upup-py-2 upup-text-xs upup-font-medium upup-text-[#333]',
                          {
                              'upup-text-[#FAFAFA] dark:upup-text-[#FAFAFA]':
                                  isDark,
                          },
                          slot.driveHeader,
                      )}
                  >
                      ${
                          navigated
                              ? html` <button
                                    type="button"
                                    data-testid="upup-drive-back"
                                    data-upup-slot="drive-back"
                                    aria-label=${tr.overlayBack}
                                    class=${cn(
                                        'upup-fx-hover-lift upup-fx-press upup-flex upup-h-7 upup-w-7 upup-shrink-0 upup-items-center upup-justify-center upup-rounded-lg',
                                        isDark
                                            ? 'upup-text-[#e2e8f0] hover:upup-bg-white/[0.08]'
                                            : 'upup-text-[#334155] hover:upup-bg-black/[0.05]',
                                    )}
                                    @click=${() => {
                                        setPath(path.slice(0, -1))
                                    }}
                                >
                                    ${icon('chevron-left')}
                                </button>`
                              : nothing
                      }
                      ${
                          navigated && !searchOpen
                              ? html` <span
                                    data-upup-slot="drive-current-folder"
                                    title=${currentFolder?.name ?? ''}
                                    class="upup-min-w-0 upup-flex-1 upup-truncate upup-font-medium"
                                    >${currentFolder?.name}</span
                                >`
                              : nothing
                      }
                      ${
                          navigated && showSearch && !searchOpen
                              ? html` <button
                                    type="button"
                                    data-testid="upup-drive-search-toggle"
                                    data-upup-slot="drive-search-toggle"
                                    aria-label=${tr.search}
                                    aria-expanded="false"
                                    class=${cn(
                                        'upup-fx-hover-lift upup-fx-press upup-ml-auto upup-flex upup-h-7 upup-w-7 upup-shrink-0 upup-items-center upup-justify-center upup-rounded-lg',
                                        hasFilter
                                            ? 'upup-text-[#0ea5e9]'
                                            : isDark
                                              ? 'upup-text-[#94a3b8] hover:upup-bg-white/[0.08]'
                                              : 'upup-text-[#64748b] hover:upup-bg-black/[0.05]',
                                    )}
                                    @click=${() => {
                                        setSearchOpen(true)
                                    }}
                                >
                                    ${icon('search')}
                                </button>`
                              : nothing
                      }
                      ${
                          showSearch && (!navigated || searchOpen)
                              ? searchField
                              : nothing
                      }
                  </div>`
                : nothing
        }
    </div>`
}
