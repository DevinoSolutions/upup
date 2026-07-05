<script lang="ts">
  import {
    useUploaderI18n,
    useUploaderOptions,
    useUploaderRuntime,
    useUploaderSource,
    useUploaderTheme,
  } from '../context/uploader-context'
  import { uploadSourceObject } from '../lib/constants'
  import { cn } from '@upup/core/internal'
  import DefaultLoaderIcon from './DefaultLoaderIcon.svelte'

  const { core } = useUploaderRuntime()
  const { activeSource, setActiveSource } = useUploaderSource()
  const { translations: tr } = useUploaderI18n()
  const { mini } = useUploaderOptions()
  const { isDark: dark, slotOverrides: slotClasses } = useUploaderTheme()

  const activeComponent = $derived(
    $activeSource ? uploadSourceObject[$activeSource]?.Component : undefined,
  )
  const SourceIcon = $derived(
    $activeSource ? uploadSourceObject[$activeSource]?.Icon : undefined,
  )

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
    class="upup-grid upup-h-full upup-w-full upup-grid-rows-[auto,1fr]"
    data-upup-slot="adapter-view"
  >
    <div
      class={cn(
        'upup-shadow-bottom upup-flex upup-items-center upup-justify-between upup-bg-black/[0.025] upup-px-3 upup-py-2 upup-text-sm upup-font-medium upup-text-[#1b5dab]',
        {
          'upup-bg-white/5 upup-text-[#FAFAFA] dark:upup-bg-white/5 dark:upup-text-[#FAFAFA]': $dark,
        },
        $slotClasses.sourceViewHeader,
      )}
    >
      {#if SourceIcon}
        <SourceIcon />
      {/if}
      <button
        class={cn(
          'upup-rounded-md upup-p-1 upup-text-blue-600 upup-transition-all upup-duration-300',
          { 'upup-text-[#30C5F7] dark:upup-text-[#30C5F7]': $dark },
          $slotClasses.sourceViewCancelButton,
        )}
        onclick={handleCancel}
        type="button"
      >
        {tr.cancel}
      </button>
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
