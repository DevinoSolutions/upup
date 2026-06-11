import { html, nothing } from 'lit-html'
import { repeat } from 'lit-html/directives/repeat.js'
import { cn } from '@upup/core'
import type { RootContext } from '../lib/types'
import { adapterViewContainer } from './shared/adapter-view-container'
import { driveAuthFallback } from './shared/drive-auth-fallback'

export type ServerModeProvider = 'google-drive' | 'onedrive' | 'dropbox' | 'box'
export type ServerDriveFile = { id: string; name: string; size?: number; mimeType?: string; thumbnailUrl?: string; isFolder: boolean; modifiedAt?: string }
type ListState =
  | { status: 'idle' } | { status: 'loading' } | { status: 'ready'; files: ServerDriveFile[] }
  | { status: 'reauth' } | { status: 'error'; message: string }

const PROVIDER_LABEL: Record<ServerModeProvider, string> = {
  'google-drive': 'Google Drive', onedrive: 'OneDrive', dropbox: 'Dropbox', box: 'Box',
}

interface ServerDriveState {
  state: ListState
  folderId: string | undefined
  search: string
  selected: Set<string>
  transferring: boolean
  abort: AbortController | null
  inited: boolean
  authListener: ((ev: MessageEvent) => void) | null
}

// Per-ctx, per-provider state. WeakMap keyed by RootContext => GC-safe + no cross-instance
// collision (replaces the fragile string-key/__id scheme).
const cells = new WeakMap<RootContext, Map<ServerModeProvider, ServerDriveState>>()
function cell(ctx: RootContext, provider: ServerModeProvider): ServerDriveState {
  let m = cells.get(ctx)
  if (!m) { m = new Map(); cells.set(ctx, m) }
  let c = m.get(provider)
  if (!c) {
    c = { state: { status: 'idle' }, folderId: undefined, search: '', selected: new Set(), transferring: false, abort: null, inited: false, authListener: null }
    m.set(provider, c)
  }
  return c
}

async function list(ctx: RootContext, provider: ServerModeProvider, opts?: { folderId?: string; search?: string }) {
  const c = cell(ctx, provider)
  const serverUrl = ctx.serverUrl
  if (!serverUrl) { c.state = { status: 'error', message: 'Server Mode requires `serverUrl` prop' }; ctx.invalidate(); return }
  c.abort?.abort()
  const ac = new AbortController(); c.abort = ac
  c.state = { status: 'loading' }; ctx.invalidate()
  const params = new URLSearchParams()
  const nextFolder = opts?.folderId ?? c.folderId
  const nextSearch = opts?.search ?? c.search
  if (nextFolder) params.set('folderId', nextFolder)
  if (nextSearch) params.set('search', nextSearch)
  try {
    const res = await fetch(`${serverUrl}/files/${provider}${params.toString() ? `?${params}` : ''}`, { credentials: 'include', signal: ac.signal })
    if (res.status === 401) { c.state = { status: 'reauth' }; ctx.invalidate(); return }
    if (!res.ok) { const text = await res.text().catch(() => ''); throw new Error(text || `${res.status}`) }
    const data = (await res.json()) as { files: ServerDriveFile[] }
    c.state = { status: 'ready', files: data.files }; ctx.invalidate()
  } catch (err) {
    if ((err as Error).name === 'AbortError') return
    c.state = { status: 'error', message: (err as Error).message }; ctx.invalidate()
  } finally { if (c.abort === ac) c.abort = null }
}

async function transfer(ctx: RootContext, provider: ServerModeProvider, file: ServerDriveFile): Promise<{ status: 'ok' | 'reauth' | 'error'; message?: string }> {
  const serverUrl = ctx.serverUrl
  if (!serverUrl) return { status: 'error', message: 'Server Mode requires `serverUrl` prop' }
  try {
    const res = await fetch(`${serverUrl}/files/${provider}/transfer`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId: file.id, fileName: file.name, size: file.size, mimeType: file.mimeType }),
    })
    if (res.status === 401) return { status: 'reauth' }
    if (!res.ok) { const text = await res.text().catch(() => ''); return { status: 'error', message: text || `${res.status}` } }
    await res.json()
    return { status: 'ok' }
  } catch (err) { return { status: 'error', message: (err as Error).message } }
}

function startAuth(ctx: RootContext, provider: ServerModeProvider) {
  const serverUrl = ctx.serverUrl
  if (!serverUrl) return
  const c = cell(ctx, provider)
  if (c.authListener) { window.removeEventListener('message', c.authListener); c.authListener = null }
  const popup = window.open(`${serverUrl}/auth/${provider}`, 'upup-oauth', 'width=600,height=700')
  if (!popup) { c.state = { status: 'error', message: 'Popup blocked. Allow popups and try again.' }; ctx.invalidate(); return }
  const onMessage = (ev: MessageEvent) => {
    const data = ev.data as { type?: string; provider?: string } | undefined
    if (data?.type === 'upup:oauth-success' && data.provider === provider) {
      window.removeEventListener('message', onMessage)
      c.authListener = null
      void list(ctx, provider)
    }
  }
  c.authListener = onMessage
  window.addEventListener('message', onMessage)
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

/** Disposer: abort in-flight + remove auth listeners + drop the ctx's cells. Called from create-uploader.destroy. */
export function disposeServerDrives(ctx: RootContext) {
  const m = cells.get(ctx)
  if (!m) return
  for (const c of m.values()) {
    c.abort?.abort()
    if (c.authListener) { window.removeEventListener('message', c.authListener); c.authListener = null }
  }
  cells.delete(ctx)
}

export function serverModeDriveUploader(ctx: RootContext, opts: { provider: ServerModeProvider; onBack?: () => void; dataUpupSlot?: string }) {
  const { provider, onBack } = opts
  const c = cell(ctx, provider)
  if (!c.inited) { c.inited = true; void list(ctx, provider) }
  const isDark = ctx.theme.getSnapshot().isDark
  const resolvedSlot = opts.dataUpupSlot ?? `drive-browser-${provider}`
  const isLoading = c.state.status === 'loading' || c.state.status === 'idle'
  const files: ServerDriveFile[] = c.state.status === 'ready' ? c.state.files : []

  if (c.state.status === 'reauth') {
    return driveAuthFallback(ctx, { providerName: PROVIDER_LABEL[provider], onRetry: () => startAuth(ctx, provider) })
  }

  const toggle = (id: string) => { if (c.selected.has(id)) c.selected.delete(id); else c.selected.add(id); ctx.invalidate() }
  const handleTransfer = async () => {
    c.transferring = true; ctx.invalidate()
    try {
      for (const file of files.filter((f) => c.selected.has(f.id))) {
        const result = await transfer(ctx, provider, file)
        if (result.status === 'reauth') { startAuth(ctx, provider); return }
      }
      c.selected = new Set()
      onBack?.()
    } finally { c.transferring = false; ctx.invalidate() }
  }

  const inner = html`
    <div data-testid="upup-server-drive-browser" class="upup-grid upup-h-full upup-w-full upup-grid-rows-[auto,1fr,auto] upup-overflow-auto">
      <div class=${cn('upup-flex upup-items-center upup-gap-2 upup-border-b upup-px-3 upup-py-2', isDark ? 'upup-border-gray-700' : 'upup-border-gray-200')} data-upup-slot="drive-browser-header">
        <span class="upup-text-sm upup-font-medium">${PROVIDER_LABEL[provider]}</span>
        <input
          type="search" name="upup-drive-search" aria-label="Search" .value=${c.search}
          @input=${(e: Event) => { c.search = (e.target as HTMLInputElement).value; ctx.invalidate() }}
          @keydown=${(e: KeyboardEvent) => { if (e.key === 'Enter') void list(ctx, provider, { search: (e.target as HTMLInputElement).value }) }}
          placeholder="Search..."
          class=${cn('upup-ml-auto upup-rounded upup-border upup-px-2 upup-py-1 upup-text-xs', isDark ? 'upup-border-gray-700 upup-bg-gray-800 upup-text-gray-100' : 'upup-border-gray-300 upup-bg-white')}
        />
      </div>
      <div class="upup-overflow-auto">
        ${c.state.status === 'error' ? html`<p class=${cn('upup-p-4 upup-text-sm', isDark ? 'upup-text-red-400' : 'upup-text-red-600')}>${c.state.message}</p>` : nothing}
        ${repeat(files, (f) => f.id, (file) => html`
          <button
            type="button" data-upup-slot="drive-browser-item" data-selected=${c.selected.has(file.id)}
            class=${cn('upup-flex upup-w-full upup-items-center upup-gap-3 upup-border-b upup-px-4 upup-py-2 upup-text-left upup-text-sm', c.selected.has(file.id) && 'upup-bg-blue-50 dark:upup-bg-blue-900/30', isDark ? 'upup-border-gray-700 upup-text-gray-100 hover:upup-bg-gray-700' : 'upup-border-gray-200 hover:upup-bg-gray-50')}
            @click=${() => (file.isFolder ? void list(ctx, provider, { folderId: file.id }) : toggle(file.id))}
          >
            <span>${file.isFolder ? '\u{1F4C1}' : '\u{1F4C4}'}</span>
            <span class="upup-flex-1 upup-truncate">${file.name}</span>
            ${file.size != null && !file.isFolder ? html`<span class="upup-text-xs upup-opacity-60">${formatBytes(file.size)}</span>` : nothing}
          </button>`)}
      </div>
      <div class="upup-flex upup-items-center upup-justify-between upup-gap-2 upup-border-t upup-p-3">
        <button type="button" class="upup-text-sm upup-opacity-70 hover:upup-opacity-100" @click=${() => onBack?.()}>Cancel</button>
        <button type="button" ?disabled=${c.selected.size === 0 || c.transferring} class="upup-rounded upup-bg-blue-600 upup-px-3 upup-py-1.5 upup-text-sm upup-text-white disabled:upup-opacity-50" @click=${handleTransfer}>
          ${c.transferring ? 'Uploading...' : `Add files${c.selected.size ? ` (${c.selected.size})` : ''}`}
        </button>
      </div>
    </div>`

  return adapterViewContainer(ctx, { isLoading, dataUpupSlot: resolvedSlot }, inner)
}
