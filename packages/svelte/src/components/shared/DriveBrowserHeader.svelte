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

  // Breadcrumbs only once the user has navigated into a folder — the root crumb
  // ("Drive") is redundant next to the provider name in the top row.
  const showBreadcrumbs = $derived(path.length > 1)

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

    {#if showSearch || showBreadcrumbs}
      <div
        class={cn(
          'upup-flex upup-items-center upup-gap-2.5 upup-px-3 upup-py-2 upup-text-xs upup-font-medium upup-text-[#333]',
          { 'upup-text-[#FAFAFA] dark:upup-text-[#FAFAFA]': $dark },
          $slotClasses.driveHeader,
        )}
      >
        {#if showBreadcrumbs}
          <div class="upup-flex upup-min-w-0 upup-shrink upup-items-center upup-gap-1">
            {#each path as p, i (p.id)}
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
              <p
                class={cn(
                  'upup-group upup-flex upup-shrink-0 upup-cursor-pointer upup-gap-1 upup-truncate',
                  { 'upup-text-[#6D6D6D] dark:upup-text-[#6D6D6D]': $dark },
                )}
                style:max-width="{100 / path.length}%"
                style:pointer-events={i === path.length - 1 ? 'none' : 'auto'}
                onclick={() => setPath(path.slice(0, i + 1))}
              >
                <span class="upup-group-hover:upup-underline upup-truncate">
                  {p.name}
                </span>
                {#if i !== path.length - 1}
                  &gt;
                {/if}
              </p>
            {/each}
          </div>
        {/if}
        {#if showSearch}
          <div class={cn('upup-relative upup-min-w-0 upup-flex-1', $slotClasses.driveSearchContainer)}>
            <input
              type="search"
              name="upup-drive-search"
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
            />
            <Icon name="search" class="upup-absolute upup-left-2.5 upup-top-1/2 upup--translate-y-1/2 upup-text-[#939393]" />
          </div>
        {/if}
      </div>
    {/if}
  </div>
{/if}
