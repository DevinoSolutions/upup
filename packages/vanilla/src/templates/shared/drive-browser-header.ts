import { html, nothing, type TemplateResult } from 'lit-html'
import { repeat } from 'lit-html/directives/repeat.js'
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

    // Breadcrumbs only once the user has navigated into a folder — the root crumb
    // ("Drive") is redundant next to the provider name in the top row.
    const showBreadcrumbs = path.length > 1

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

    return html` <div data-upup-slot="drive-browser-header">
        ${
            showSearch || showBreadcrumbs
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
                          showBreadcrumbs
                              ? html` <div
                                    class="upup-flex upup-min-w-0 upup-shrink upup-items-center upup-gap-1"
                                >
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
                                                style="max-width: ${
                                                    100 / path.length
                                                }%; pointer-events: ${
                                                    i === path.length - 1
                                                        ? 'none'
                                                        : 'auto'
                                                }"
                                                @click=${() => {
                                                    setPath(
                                                        path.slice(0, i + 1),
                                                    )
                                                }}
                                            >
                                                <span
                                                    class="upup-group-hover:upup-underline upup-truncate"
                                                    >${p.name}</span
                                                >
                                                ${
                                                    i !== path.length - 1
                                                        ? html` &gt; `
                                                        : nothing
                                                }
                                            </p>`,
                                    )}
                                </div>`
                              : nothing
                      }
                      ${
                          showSearch
                              ? html` <div
                                    class=${cn(
                                        'upup-relative upup-min-w-0 upup-flex-1',
                                        slot.driveSearchContainer,
                                    )}
                                >
                                    <input
                                        type="search"
                                        name="upup-drive-search"
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
                                            onSearch(
                                                (e.target as HTMLInputElement)
                                                    .value,
                                            )
                                        }}
                                    />
                                    ${icon('search', {
                                        class: 'upup-absolute upup-left-2.5 upup-top-1/2 upup--translate-y-1/2 upup-text-[#939393]',
                                    })}
                                </div>`
                              : nothing
                      }
                  </div>`
                : nothing
        }
    </div>`
}
