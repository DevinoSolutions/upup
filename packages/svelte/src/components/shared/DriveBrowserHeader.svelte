<script lang="ts">
  import { writable } from 'svelte/store'
  import { type DriveFolder, type DriveUser } from '@upupjs/core'
import { cn } from '@upupjs/core/internal'
  import {
    useUploaderI18n,
    useUploaderSource,
    useUploaderTheme,
  } from '../../context/uploader-context'
  import {
    useSourceViewHeaderExtra,
    portal,
  } from '../../context/source-view-header-extra'
  import Icon from '../Icon.svelte'

  const {
    path,
    setPath,
    handleSignOut,
    showSearch,
    searchTerm,
    onSearch,
    user,
  }: {
    path: DriveFolder[]
    setPath: (newPath: DriveFolder[]) => void
    handleSignOut: () => Promise<void>
    showSearch: boolean
    searchTerm: string
    onSearch: (value: string) => void
    user?: DriveUser | undefined
  } = $props()

  const { setActiveSource } = useUploaderSource()
  const { translations: tr } = useUploaderI18n()
  const { isDark: dark, slotOverrides: slotClasses } = useUploaderTheme()

  const headerExtraStore =
    useSourceViewHeaderExtra() ?? writable<HTMLElement | null>(null)

  // Once navigated into a folder we show a Back affordance + the current folder
  // name, not a full breadcrumb trail (long provider folder names blew the row
  // up, and multi-level jumps weren't worth the fragility).
  const navigated = $derived(path.length > 1)
  const currentFolder = $derived(path[path.length - 1])
  const hasFilter = $derived(searchTerm.trim().length > 0)

  // Collapsed/expanded search lives here; the term itself stays in DriveBrowser.
  let searchOpen = $state(false)
  let searchInputEl = $state<HTMLInputElement | null>(null)

  // Focus the field the moment it expands.
  $effect(() => {
    if (searchOpen && searchInputEl) searchInputEl.focus()
  })

  function onLogout() {
    void handleSignOut()
    setActiveSource(undefined)
  }
</script>

{#if user}
  <div data-upup-slot="drive-browser-header">
    <!-- Account controls live in the SourceView header row (portal), next to
         Back, separated by a hairline — not in their own strip. -->
    {#if $headerExtraStore}
      <div style="display: contents" use:portal={$headerExtraStore}>
        <div
          class="upup-relative upup-flex upup-h-6 upup-w-6 upup-items-center upup-justify-center upup-overflow-hidden upup-rounded-full"
        >
          {#if !!user.picture}
            <img
              alt={user.name}
              src={user.picture}
              class="upup-bg-center upup-object-cover"
            />
          {:else}
            <Icon name="user" class="upup-text-xl" />
          {/if}
        </div>
        <button
          class={cn(
            'upup-hover:upup-underline upup-text-xs upup-font-medium upup-text-[#0284c7]',
            { 'upup-text-[#38bdf8] dark:upup-text-[#38bdf8]': $dark },
            $slotClasses.driveLogoutButton,
          )}
          onclick={onLogout}
        >
          {tr.logOut}
        </button>
        <span
          aria-hidden="true"
          class={cn('upup-h-4 upup-w-px', $dark ? 'upup-bg-white/15' : 'upup-bg-black/15')}
        ></span>
      </div>
    {/if}

    {#if showSearch || navigated}
      <div
        class={cn(
          'upup-flex upup-items-center upup-gap-2.5 upup-px-3 upup-py-2 upup-text-xs upup-font-medium upup-text-[#333]',
          { 'upup-text-[#FAFAFA] dark:upup-text-[#FAFAFA]': $dark },
          $slotClasses.driveHeader,
        )}
      >
        {#if navigated}
          <button
            type="button"
            data-testid="upup-drive-back"
            data-upup-slot="drive-back"
            aria-label={tr.overlayBack}
            class={cn(
              'upup-fx-hover-lift upup-fx-press upup-flex upup-h-7 upup-w-7 upup-shrink-0 upup-items-center upup-justify-center upup-rounded-lg',
              $dark
                ? 'upup-text-[#e2e8f0] hover:upup-bg-white/[0.08]'
                : 'upup-text-[#334155] hover:upup-bg-black/[0.05]',
            )}
            onclick={() => setPath(path.slice(0, -1))}
          >
            <Icon name="chevron-left" />
          </button>
        {/if}
        {#if navigated && !searchOpen}
          <span
            data-upup-slot="drive-current-folder"
            title={currentFolder?.name}
            class="upup-min-w-0 upup-flex-1 upup-truncate upup-font-medium"
          >
            {currentFolder?.name}
          </span>
        {/if}
        {#if navigated && showSearch && !searchOpen}
          <button
            type="button"
            data-testid="upup-drive-search-toggle"
            data-upup-slot="drive-search-toggle"
            aria-label={tr.search}
            aria-expanded="false"
            class={cn(
              'upup-fx-hover-lift upup-fx-press upup-ml-auto upup-flex upup-h-7 upup-w-7 upup-shrink-0 upup-items-center upup-justify-center upup-rounded-lg',
              hasFilter
                ? 'upup-text-[#0ea5e9]'
                : $dark
                  ? 'upup-text-[#94a3b8] hover:upup-bg-white/[0.08]'
                  : 'upup-text-[#64748b] hover:upup-bg-black/[0.05]',
            )}
            onclick={() => (searchOpen = true)}
          >
            <Icon name="search" />
          </button>
        {/if}
        {#if showSearch && (!navigated || searchOpen)}
          <div
            class={cn(
              'upup-relative upup-min-w-0 upup-flex-1',
              navigated && 'upup-fx-search-expand',
              $slotClasses.driveSearchContainer,
            )}
          >
            <input
              bind:this={searchInputEl}
              type="search"
              name="upup-drive-search"
              data-testid="upup-drive-search-input"
              data-upup-slot="drive-search-input"
              aria-label={tr.search}
              class={cn(
                'upup-w-full upup-rounded-lg upup-px-3 upup-py-1.5 upup-pl-8 upup-text-xs upup-outline-none upup-ring-1 upup-transition-shadow focus:upup-ring-2 focus:upup-ring-[#38bdf8]',
                $dark
                  ? 'upup-bg-white/[0.06] upup-text-[#e2e8f0] upup-ring-white/[0.1] placeholder:upup-text-[#64748b]'
                  : 'upup-bg-white upup-text-[#0f172a] upup-ring-black/[0.08] placeholder:upup-text-[#94a3b8]',
                $slotClasses.driveSearchInput,
              )}
              placeholder={tr.search}
              value={searchTerm}
              oninput={(e) => onSearch((e.target as HTMLInputElement).value)}
              onkeydown={(e) => {
                if (e.key === 'Escape') searchOpen = false
              }}
              onblur={() => {
                if (!searchTerm) searchOpen = false
              }}
            />
            <Icon name="search" class="upup-absolute upup-left-2.5 upup-top-1/2 upup--translate-y-1/2 upup-text-[#939393]" />
          </div>
        {/if}
      </div>
    {/if}
  </div>
{/if}
