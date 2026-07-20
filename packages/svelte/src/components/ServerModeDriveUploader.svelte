<script lang="ts">
  import { writable, derived } from 'svelte/store'
  import { untrack } from 'svelte'
  import { errorCodeToMessageKey } from '@upupjs/core'
import { cn } from '@upupjs/core/internal'
  import {
    useUploaderI18n,
    useUploaderOptions,
    useUploaderTheme,
  } from '../context/uploader-context'
  import {
    useServerModeDrive,
    type ServerDriveFile,
    type ServerModeProvider,
  } from '../composables/useServerModeDrive'
  import SourceViewContainer from './shared/SourceViewContainer.svelte'
  import DriveAuthFallback from './shared/DriveAuthFallback.svelte'

  let {
    provider,
    onBack,
    dataUpupSlot,
  }: {
    provider: ServerModeProvider
    onBack?: () => void
    dataUpupSlot?: string
  } = $props()

  const PROVIDER_LABEL: Record<ServerModeProvider, string> = {
    'google-drive': 'Google Drive',
    'one-drive': 'OneDrive',
    'dropbox': 'Dropbox',
    'box': 'Box',
  }

  // provider and dataUpupSlot are static props (set once at call sites — never changed).
  // untrack() tells Svelte we intentionally read their initial values outside reactive context.
  const resolvedSlot = untrack(() => dataUpupSlot ?? `drive-browser-${provider}`)
  const { state, search, setSearch, refresh, transfer, startAuth } =
    untrack(() => useServerModeDrive(provider))

  const { isDark: dark } = useUploaderTheme()
  const { icons } = useUploaderOptions()
  const { translator } = useUploaderI18n()
  const Loader = icons.LoaderIcon

  const errorText = derived(state, ($state) => {
    if ($state.status !== 'error') return ''
    return $state.code && translator
      ? translator(`errors.${errorCodeToMessageKey($state.code)}`, {
          code: $state.code,
        })
      : $state.message
  })

  const selected = writable<Set<string>>(new Set())
  const transferring = writable(false)

  const isLoading = derived(state, ($state) =>
    $state.status === 'loading' || $state.status === 'idle',
  )
  const files = derived(state, ($state): ServerDriveFile[] =>
    $state.status === 'ready' ? $state.files : [],
  )

  function toggle(id: string) {
    selected.update((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleTransfer() {
    transferring.set(true)
    try {
      for (const file of $files.filter((f) => $selected.has(f.id))) {
        const result = await transfer(file)
        if (result.status === 'reauth') {
          startAuth()
          return
        }
      }
      selected.set(new Set())
      onBack?.()
    } finally {
      transferring.set(false)
    }
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
  }
</script>

{#if $state.status === 'reauth'}
  <DriveAuthFallback
    providerName={PROVIDER_LABEL[provider]}
    onRetry={startAuth}
  />
{:else}
  <SourceViewContainer
    isLoading={$isLoading}
    data-upup-slot={resolvedSlot}
  >
    {#if $isLoading}
      <Loader />
    {:else}
      <div
        data-testid="upup-server-drive-browser"
        class="upup-grid upup-h-full upup-w-full upup-grid-rows-[auto,1fr,auto] upup-overflow-auto"
      >
        <div
          class={cn(
            'upup-flex upup-items-center upup-gap-2 upup-border-b upup-px-3 upup-py-2.5',
            $dark
              ? 'upup-border-white/[0.06] upup-text-[#e2e8f0]'
              : 'upup-border-black/[0.06] upup-text-gray-800',
          )}
          data-upup-slot="drive-browser-header"
        >
          <span class="upup-text-sm upup-font-medium">
            {PROVIDER_LABEL[provider]}
          </span>
          <input
            type="search"
            name="upup-drive-search"
            aria-label="Search"
            value={$search}
            oninput={(e) => setSearch((e.target as HTMLInputElement).value)}
            onkeydown={(e) => {
              if (e.key === 'Enter') {
                void refresh({ search: (e.target as HTMLInputElement).value })
              }
            }}
            placeholder="Search…"
            class={cn(
              'upup-ml-auto upup-rounded upup-border upup-px-2 upup-py-1 upup-text-xs',
              $dark
                ? 'upup-border-gray-700 upup-bg-gray-800 upup-text-gray-100'
                : 'upup-border-gray-300 upup-bg-white',
            )}
          />
        </div>
        <div class="upup-overflow-auto upup-p-2">
          {#if $state.status === 'error'}
            <p
              data-testid="upup-drive-error"
              data-upup-slot="drive-error"
              role="alert"
              class={cn(
                'upup-p-4 upup-text-sm',
                $dark ? 'upup-text-red-400' : 'upup-text-red-600',
              )}
            >
              {$errorText}
            </p>
          {/if}
          {#each $files as file (file.id)}
            <button
              type="button"
              data-upup-slot="drive-browser-item"
              data-selected={$selected.has(file.id)}
              class={cn(
                'upup-fx-hover-lift upup-mb-1.5 upup-flex upup-w-full upup-items-center upup-gap-3 upup-rounded-[11px] upup-px-3 upup-py-2.5 upup-text-left upup-text-sm upup-ring-1',
                $selected.has(file.id)
                  ? 'upup-bg-[#0ea5e9]/10 upup-ring-[#38bdf8]/35'
                  : $dark
                    ? 'upup-bg-white/[0.04] upup-text-[#e2e8f0] upup-ring-white/[0.06] hover:upup-bg-white/[0.07]'
                    : 'upup-bg-black/[0.03] upup-text-gray-800 upup-ring-black/[0.06] hover:upup-bg-black/[0.05]',
              )}
              onclick={() =>
                file.isFolder
                  ? void refresh({ folderId: file.id })
                  : toggle(file.id)}
            >
              <span
                class="upup-flex upup-h-[30px] upup-w-[30px] upup-flex-none upup-items-center upup-justify-center upup-rounded-[8px] upup-bg-white/[0.05]"
                aria-hidden="true"
              >
                {#if file.isFolder}
                  <svg
                    viewBox="0 0 24 24"
                    width="17"
                    height="17"
                    fill="none"
                    stroke="#38bdf8"
                    stroke-width="1.7"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  </svg>
                {:else}
                  <svg
                    viewBox="0 0 24 24"
                    width="17"
                    height="17"
                    fill="none"
                    stroke={$dark ? '#94a3b8' : '#64748b'}
                    stroke-width="1.6"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M6 3h8l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
                    <path d="M14 3v4h4" />
                  </svg>
                {/if}
              </span>
              <span class="upup-flex-1 upup-truncate">{file.name}</span>
              {#if file.size != null && !file.isFolder}
                <span class="upup-text-xs upup-opacity-60">
                  {formatBytes(file.size)}
                </span>
              {/if}
            </button>
          {/each}
        </div>
        <div
          class={cn(
            'upup-flex upup-items-center upup-justify-between upup-gap-2 upup-border-t upup-p-3',
            $dark ? 'upup-border-white/[0.06]' : 'upup-border-black/[0.06]',
          )}
        >
          <button
            type="button"
            class="upup-text-sm upup-opacity-70 hover:upup-opacity-100"
            onclick={() => onBack?.()}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={$selected.size === 0 || $transferring}
            class="upup-fx-press upup-rounded-lg upup-bg-[#0ea5e9] upup-px-3 upup-py-1.5 upup-text-sm upup-font-medium upup-text-white hover:upup-bg-[#0284c7] disabled:upup-opacity-50"
            onclick={handleTransfer}
          >
            {$transferring
              ? 'Uploading…'
              : `Add files${$selected.size ? ` (${$selected.size})` : ''}`}
          </button>
        </div>
      </div>
    {/if}
  </SourceViewContainer>
{/if}
