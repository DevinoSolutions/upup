<script lang="ts">
  import { writable, derived } from 'svelte/store'
  import { untrack } from 'svelte'
  import { cn } from '@upup/core'
  import { useUploaderTheme } from '../context/root-context'
  import {
    useServerModeDrive,
    type ServerDriveFile,
    type ServerModeProvider,
  } from '../composables/useServerModeDrive'
  import AdapterViewContainer from './shared/AdapterViewContainer.svelte'
  import DriveAuthFallback from './shared/DriveAuthFallback.svelte'
  import ShouldRender from './shared/ShouldRender.svelte'

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
    'onedrive': 'OneDrive',
    'dropbox': 'Dropbox',
    'box': 'Box',
  }

  // provider and dataUpupSlot are static props (set once at call sites — never changed).
  // untrack() tells Svelte we intentionally read their initial values outside reactive context.
  const resolvedSlot = untrack(() => dataUpupSlot ?? `drive-browser-${provider}`)
  const { state, search, setSearch, refresh, transfer, startAuth } =
    untrack(() => useServerModeDrive(provider))

  const { isDark: dark } = useUploaderTheme()

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
  <AdapterViewContainer
    isLoading={$isLoading}
    data-upup-slot={resolvedSlot}
  >
    <ShouldRender if={true} isLoading={$isLoading}>
      <div
        data-testid="upup-server-drive-browser"
        class="upup-grid upup-h-full upup-w-full upup-grid-rows-[auto,1fr,auto] upup-overflow-auto"
      >
        <div
          class={cn(
            'upup-flex upup-items-center upup-gap-2 upup-border-b upup-px-3 upup-py-2',
            $dark ? 'upup-border-gray-700' : 'upup-border-gray-200',
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
            placeholder="Search..."
            class={cn(
              'upup-ml-auto upup-rounded upup-border upup-px-2 upup-py-1 upup-text-xs',
              $dark
                ? 'upup-border-gray-700 upup-bg-gray-800 upup-text-gray-100'
                : 'upup-border-gray-300 upup-bg-white',
            )}
          />
        </div>
        <div class="upup-overflow-auto">
          {#if $state.status === 'error'}
            <p
              class={cn(
                'upup-p-4 upup-text-sm',
                $dark ? 'upup-text-red-400' : 'upup-text-red-600',
              )}
            >
              {$state.message}
            </p>
          {/if}
          {#each $files as file (file.id)}
            <button
              type="button"
              data-upup-slot="drive-browser-item"
              data-selected={$selected.has(file.id)}
              class={cn(
                'upup-flex upup-w-full upup-items-center upup-gap-3 upup-border-b upup-px-4 upup-py-2 upup-text-left upup-text-sm',
                $selected.has(file.id) && 'upup-bg-blue-50 dark:upup-bg-blue-900/30',
                $dark
                  ? 'upup-border-gray-700 upup-text-gray-100 hover:upup-bg-gray-700'
                  : 'upup-border-gray-200 hover:upup-bg-gray-50',
              )}
              onclick={() =>
                file.isFolder
                  ? void refresh({ folderId: file.id })
                  : toggle(file.id)}
            >
              <span>{file.isFolder ? '📁' : '📄'}</span>
              <span class="upup-flex-1 upup-truncate">{file.name}</span>
              {#if file.size != null && !file.isFolder}
                <span class="upup-text-xs upup-opacity-60">
                  {formatBytes(file.size)}
                </span>
              {/if}
            </button>
          {/each}
        </div>
        <div class="upup-flex upup-items-center upup-justify-between upup-gap-2 upup-border-t upup-p-3">
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
            class="upup-rounded upup-bg-blue-600 upup-px-3 upup-py-1.5 upup-text-sm upup-text-white disabled:upup-opacity-50"
            onclick={handleTransfer}
          >
            {$transferring
              ? 'Uploading...'
              : `Add files${$selected.size ? ` (${$selected.size})` : ''}`}
          </button>
        </div>
      </div>
    </ShouldRender>
  </AdapterViewContainer>
{/if}
