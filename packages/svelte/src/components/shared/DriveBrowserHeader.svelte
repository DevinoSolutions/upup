<script lang="ts">
  import { type DriveFolder, type DriveUser, cn } from '@upup/core'
  import {
    useUploaderI18n,
    useUploaderSource,
    useUploaderTheme,
  } from '../../context/root-context'
  import { SearchIcon, UserIcon } from '../Icons'
  import ShouldRender from './ShouldRender.svelte'

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
    user?: DriveUser
  } = $props()

  const { setActiveAdapter } = useUploaderSource()
  const { translations: tr } = useUploaderI18n()
  const { isDark: dark, slotOverrides: slotClasses } = useUploaderTheme()
</script>

{#if user}
  <div data-upup-slot="drive-browser-header">
    <div
      class={cn(
        'upup-shadow-bottom upup-grid upup-grid-cols-[1fr,auto] upup-bg-black/[0.025] upup-px-3 upup-py-2 upup-text-xs upup-font-medium upup-text-[#333]',
        {
          'upup-bg-white/5 upup-text-[#FAFAFA] dark:upup-bg-white/5 dark:upup-text-[#FAFAFA]': $dark,
        },
        $slotClasses.driveHeader,
      )}
    >
      <ShouldRender if={!!path}>
        <div class="upup-flex upup-items-center upup-gap-1">
          {#each path as p, i (p.id)}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
            <p
              class={cn(
                'upup-group upup-flex upup-shrink-0 upup-cursor-pointer upup-gap-1 upup-truncate',
                {
                  'upup-text-[#6D6D6D] dark:upup-text-[#6D6D6D]': $dark,
                },
              )}
              style:max-width="{100 / path.length}%"
              style:pointer-events={i === path.length - 1 ? 'none' : 'auto'}
              onclick={() => setPath(path.slice(0, i + 1))}
            >
              <span class="upup-group-hover:upup-underline upup-truncate">
                {p.name}
              </span>
              {#if i !== path.length - 1}
                {' '}&gt;{' '}
              {/if}
            </p>
          {/each}
        </div>
      </ShouldRender>
      <div class="upup-flex upup-items-center upup-gap-2">
        <div class="upup-relative upup-flex upup-h-8 upup-w-8 upup-items-center upup-justify-center upup-overflow-hidden upup-rounded-full">
          <ShouldRender if={!!user.picture}>
            <img
              alt={user.name}
              src={user.picture}
              class="upup-bg-center upup-object-cover"
            />
          </ShouldRender>
          <ShouldRender if={!user.picture}>
            <UserIcon class="upup-text-xl" />
          </ShouldRender>
        </div>

        <button
          class={cn(
            'upup-hover:upup-underline upup-text-blue-600',
            {
              'upup-text-[#30C5F7] dark:upup-text-[#30C5F7]': $dark,
            },
            $slotClasses.driveLogoutButton,
          )}
          onclick={() => { handleSignOut(); setActiveAdapter(undefined) }}
        >
          {tr.logOut}
        </button>
      </div>
    </div>

    <ShouldRender if={showSearch}>
      <div
        class={cn(
          'upup-relative upup-h-fit upup-bg-black/[0.025] upup-px-3 upup-py-2',
          {
            'upup-bg-white/5 upup-text-[#fafafa] dark:upup-bg-white/5 dark:upup-text-[#fafafa]': $dark,
          },
          $slotClasses.driveSearchContainer,
        )}
      >
        <input
          type="search"
          name="upup-drive-search"
          aria-label={tr.search}
          class={cn(
            'upup-h-fit upup-w-full upup-rounded-md upup-bg-black/[0.025] upup-px-3 upup-py-2 upup-pl-8 upup-text-xs upup-outline-none upup-transition-all upup-duration-300',
            {
              'upup-bg-white/5 upup-text-[#6D6D6D] dark:upup-bg-white/5 dark:upup-text-[#6D6D6D]': $dark,
            },
            $slotClasses.driveSearchInput,
          )}
          placeholder={tr.search}
          value={searchTerm}
          oninput={(e) => onSearch((e.target as HTMLInputElement).value)}
        />
        <SearchIcon class="upup-absolute upup-left-5 upup-top-1/2 upup--translate-y-1/2 upup-text-[#939393]" />
      </div>
    </ShouldRender>
  </div>
{/if}
