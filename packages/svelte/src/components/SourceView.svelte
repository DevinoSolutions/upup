<script lang="ts">
  import {
    useUploaderI18n,
    useUploaderOptions,
    useUploaderRuntime,
    useUploaderSource,
    useUploaderTheme,
  } from '../context/uploader-context'
  import { provideSourceViewHeaderExtra } from '../context/source-view-header-extra'
  import { uploadSourceObject } from '../lib/constants'
  import { cn } from '@upupjs/core/internal'
  import DefaultLoaderIcon from './DefaultLoaderIcon.svelte'

  const { core } = useUploaderRuntime()
  const { activeSource, setActiveSource } = useUploaderSource()
  const { translations: tr } = useUploaderI18n()
  const { mini } = useUploaderOptions()
  const { isDark: dark, slotOverrides: slotClasses } = useUploaderTheme()

  // Portal host for a source view's header extras (drive avatar + log out); lives
  // left of Back. `empty:upup-hidden` keeps the flex gap from showing when no
  // view portals anything in.
  const headerExtraStore = provideSourceViewHeaderExtra()
  let headerExtraHost: HTMLElement | null = $state(null)
  $effect(() => {
    headerExtraStore.set(headerExtraHost)
  })

  const activeComponent = $derived(
    $activeSource ? uploadSourceObject[$activeSource]?.Component : undefined,
  )
  const SourceIcon = $derived(
    $activeSource ? uploadSourceObject[$activeSource]?.Icon : undefined,
  )
  const sourceName = $derived.by(() => {
    const s = $activeSource
    const entry = s ? uploadSourceObject[s] : undefined
    return entry ? tr[entry.nameKey] : ''
  })

  const shouldRender = $derived(
    !!activeComponent && !mini && !!$activeSource && !!SourceIcon,
  )

  function handleCancel() {
    core?.emit('source-view-cancel', { sourceId: $activeSource })
    setActiveSource(undefined)
  }
</script>

{#if shouldRender}
  <div
    class="upup-animate-fx-view upup-grid upup-h-full upup-w-full upup-grid-rows-[auto,1fr]"
    data-upup-slot="source-view"
  >
    <!-- Transparent header on the panel gradient (no inner box): the
         provider icon + name fill the row; "Back" returns to sources. -->
    <div
      class={cn(
        'upup-flex upup-items-center upup-justify-between upup-gap-2 upup-px-3 upup-py-2 upup-text-sm upup-font-medium',
        $dark ? 'upup-text-[#FAFAFA]' : 'upup-text-[#0f172a]',
        $slotClasses.sourceViewHeader,
      )}
    >
      <span class="upup-flex upup-items-center upup-gap-2">
        {#if SourceIcon}
          <SourceIcon />
        {/if}
        <span>{sourceName}</span>
      </span>
      <span class="upup-flex upup-items-center upup-gap-2.5">
        <span
          bind:this={headerExtraHost}
          data-upup-slot="source-view-header-extra"
          class="upup-flex upup-items-center upup-gap-2.5 empty:upup-hidden"
        ></span>
        <button
          class={cn(
            'upup-rounded-md upup-p-1 upup-text-[#0284c7] upup-transition-all upup-duration-300',
            { 'upup-text-[#38bdf8] dark:upup-text-[#38bdf8]': $dark },
            $slotClasses.sourceViewCancelButton,
          )}
          onclick={handleCancel}
          type="button"
        >
          {tr.overlayBack}
        </button>
      </span>
    </div>
    {#if activeComponent}
      {#await activeComponent()}
        <div class="upup-flex upup-h-full upup-items-center upup-justify-center">
          <DefaultLoaderIcon />
        </div>
      {:then mod}
        <mod.default />
      {/await}
    {/if}
  </div>
{/if}
