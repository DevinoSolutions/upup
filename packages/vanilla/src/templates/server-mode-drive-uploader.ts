import { html, nothing, type TemplateResult } from 'lit-html'
import { repeat } from 'lit-html/directives/repeat.js'
import { errorCodeToMessageKey } from '@upup/core'
import { ServerModeDriveController, cn } from '@upup/core/internal'
import type { ServerModeProvider, ServerDriveFile } from '@upup/core'
export type { ServerModeProvider, ServerDriveFile }
import type { UploaderContext } from '../lib/types'
import { sourceViewContainer } from './shared/source-view-container'
import { driveAuthFallback } from './shared/drive-auth-fallback'

const PROVIDER_LABEL: Record<ServerModeProvider, string> = {
    'google-drive': 'Google Drive',
    onedrive: 'OneDrive',
    dropbox: 'Dropbox',
    box: 'Box',
}

// Server-mode drive flow is owned by core's ServerModeDriveController — the single
// server-mode drive abstraction (CLAUDE.md P16). This template holds ONLY the lit-html
// render bound to the controller's snapshot; the fetch / 401-reauth / abort / transfer
// trust logic lives in core so vanilla stays byte-identical in behavior to the other
// four ports and cannot re-diverge on 401 semantics (F-766 / F-706).
interface ServerDriveCell {
    controller: ServerModeDriveController
    unsubscribe: () => void
    // UI-only concerns (a consumer's selection + transfer flag), NOT part of the
    // controller's list/folder/search state — mirrors angular's Angular-only signals.
    selected: Set<string>
    transferring: boolean
    inited: boolean
}

// Per-ctx, per-provider cell. WeakMap keyed by UploaderContext => GC-safe + no cross-instance
// collision (replaces the fragile string-key/__id scheme).
const cells = new WeakMap<
    UploaderContext,
    Map<ServerModeProvider, ServerDriveCell>
>()
function cell(
    ctx: UploaderContext,
    provider: ServerModeProvider,
): ServerDriveCell {
    let m = cells.get(ctx)
    if (!m) {
        m = new Map()
        cells.set(ctx, m)
    }
    let c = m.get(provider)
    if (!c) {
        const controller = new ServerModeDriveController({
            provider,
            serverUrl: () => ctx.serverUrl,
        })
        c = {
            controller,
            // Controller snapshot changes drive a re-render through the render loop.
            unsubscribe: controller.subscribe(() => {
                ctx.invalidate()
            }),
            selected: new Set(),
            transferring: false,
            inited: false,
        }
        m.set(provider, c)
    }
    return c
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024)
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

/** Teardown: destroy every provider controller (aborts in-flight + removes auth listeners) and drop the ctx's cells. Called from create-uploader.destroy. */
export function destroyServerDrives(ctx: UploaderContext): void {
    const m = cells.get(ctx)
    if (!m) return
    for (const c of m.values()) {
        c.unsubscribe()
        c.controller.destroy()
    }
    cells.delete(ctx)
}

export function serverModeDriveUploader(
    ctx: UploaderContext,
    opts: {
        provider: ServerModeProvider
        onBack?: () => void
        dataUpupSlot?: string
    },
): TemplateResult {
    const { provider, onBack } = opts
    const c = cell(ctx, provider)
    const { controller } = c
    if (!c.inited) {
        c.inited = true
        controller.init()
    }
    const snap = controller.getSnapshot()
    const isDark = ctx.theme.getSnapshot().isDark
    const resolvedSlot = opts.dataUpupSlot ?? `drive-browser-${provider}`
    const isLoading =
        snap.state.status === 'loading' || snap.state.status === 'idle'
    const files: ServerDriveFile[] =
        snap.state.status === 'ready' ? snap.state.files : []

    if (snap.state.status === 'reauth') {
        return driveAuthFallback(ctx, {
            providerName: PROVIDER_LABEL[provider],
            onRetry: () => {
                controller.startAuth()
            },
        })
    }

    const toggle = (id: string) => {
        if (c.selected.has(id)) c.selected.delete(id)
        else c.selected.add(id)
        ctx.invalidate()
    }
    const handleTransfer = async () => {
        c.transferring = true
        ctx.invalidate()
        try {
            for (const file of files.filter(f => c.selected.has(f.id))) {
                const result = await controller.transfer(file)
                if (result.status === 'reauth') {
                    controller.startAuth()
                    return
                }
            }
            c.selected = new Set()
            onBack?.()
        } finally {
            c.transferring = false
            ctx.invalidate()
        }
    }

    const inner = html` <div
        data-testid="upup-server-drive-browser"
        class="upup-grid upup-h-full upup-w-full upup-grid-rows-[auto,1fr,auto] upup-overflow-auto"
    >
        <div
            class=${cn(
                'upup-flex upup-items-center upup-gap-2 upup-border-b upup-px-3 upup-py-2',
                isDark ? 'upup-border-gray-700' : 'upup-border-gray-200',
            )}
            data-upup-slot="drive-browser-header"
        >
            <span class="upup-text-sm upup-font-medium"
                >${PROVIDER_LABEL[provider]}</span
            >
            <input
                type="search"
                name="upup-drive-search"
                aria-label="Search"
                .value=${snap.search}
                @input=${(e: Event) => {
                    controller.setSearch((e.target as HTMLInputElement).value)
                }}
                @keydown=${(e: KeyboardEvent) => {
                    if (e.key === 'Enter')
                        void controller.list({
                            search: (e.target as HTMLInputElement).value,
                        })
                }}
                placeholder="Search..."
                class=${cn(
                    'upup-ml-auto upup-rounded upup-border upup-px-2 upup-py-1 upup-text-xs',
                    isDark
                        ? 'upup-border-gray-700 upup-bg-gray-800 upup-text-gray-100'
                        : 'upup-border-gray-300 upup-bg-white',
                )}
            />
        </div>
        <div class="upup-overflow-auto">
            ${
                snap.state.status === 'error'
                    ? html`<p
                          data-testid="upup-drive-error"
                          data-upup-slot="drive-error"
                          role="alert"
                          class=${cn(
                              'upup-p-4 upup-text-sm',
                              isDark
                                  ? 'upup-text-red-400'
                                  : 'upup-text-red-600',
                          )}
                      >
                          ${
                              snap.state.code
                                  ? ctx.translator(
                                        `errors.${errorCodeToMessageKey(snap.state.code)}`,
                                        { code: snap.state.code },
                                    )
                                  : snap.state.message
                          }
                      </p>`
                    : nothing
            }
            ${repeat(
                files,
                f => f.id,
                file =>
                    html` <button
                        type="button"
                        data-upup-slot="drive-browser-item"
                        data-selected=${c.selected.has(file.id)}
                        class=${cn(
                            'upup-flex upup-w-full upup-items-center upup-gap-3 upup-border-b upup-px-4 upup-py-2 upup-text-left upup-text-sm',
                            c.selected.has(file.id) &&
                                'upup-bg-blue-50 dark:upup-bg-blue-900/30',
                            isDark
                                ? 'upup-border-gray-700 upup-text-gray-100 hover:upup-bg-gray-700'
                                : 'upup-border-gray-200 hover:upup-bg-gray-50',
                        )}
                        @click=${() => {
                            file.isFolder
                                ? void controller.list({
                                      folderId: file.id,
                                  })
                                : toggle(file.id)
                        }}
                    >
                        <span
                            >${file.isFolder ? '\u{1F4C1}' : '\u{1F4C4}'}</span
                        >
                        <span class="upup-flex-1 upup-truncate"
                            >${file.name}</span
                        >
                        ${
                            file.size != null && !file.isFolder
                                ? html`<span
                                      class="upup-text-xs upup-opacity-60"
                                      >${formatBytes(file.size)}</span
                                  >`
                                : nothing
                        }
                    </button>`,
            )}
        </div>
        <div
            class="upup-flex upup-items-center upup-justify-between upup-gap-2 upup-border-t upup-p-3"
        >
            <button
                type="button"
                class="upup-text-sm upup-opacity-70 hover:upup-opacity-100"
                @click=${() => onBack?.()}
            >
                Cancel
            </button>
            <button
                type="button"
                ?disabled=${c.selected.size === 0 || c.transferring}
                class="upup-rounded upup-bg-blue-600 upup-px-3 upup-py-1.5 upup-text-sm upup-text-white disabled:upup-opacity-50"
                @click=${handleTransfer}
            >
                ${
                    c.transferring
                        ? 'Uploading...'
                        : `Add files${c.selected.size ? ` (${c.selected.size})` : ''}`
                }
            </button>
        </div>
    </div>`

    return sourceViewContainer(
        ctx,
        { isLoading, dataUpupSlot: resolvedSlot },
        inner,
    )
}
