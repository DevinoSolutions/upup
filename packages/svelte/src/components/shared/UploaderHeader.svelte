<script lang="ts">
  import { derived } from 'svelte/store'
  import { formatUiMessage as t, pluralUiMessage as plural } from '@upupjs/core'
import { isUploadActive, cn } from '@upupjs/core/internal'
  import {
    useUploaderFiles,
    useUploaderI18n,
    useUploaderOptions,
    useUploaderTheme,
    useUploaderUploadControls,
    useUploaderView,
  } from '../../context/uploader-context'
  import Icon from '../Icon.svelte'

  let { handleCancel }: { handleCancel: () => void } = $props()

  const { files } = useUploaderFiles()
  const { setIsAddingMore, isAddingMore, viewMode, setViewMode } = useUploaderView()
  const { translations: tr } = useUploaderI18n()
  const {
    mini,
    limit,
    isProcessing,
    icons: { ContainerAddMoreIcon },
  } = useUploaderOptions()
  const { isDark: dark, slotOverrides: slotClasses } = useUploaderTheme()
  const { upload: { uploadStatus } } = useUploaderUploadControls()

  const isUploading = derived(uploadStatus, $s => isUploadActive($s))
  const isLimitReached = derived(files, $f => limit === $f.size)
  const cancelText = derived(
    isAddingMore,
    $isAddingMore => $isAddingMore ? tr.cancel : tr.removeAllFiles,
  )

  function toggleViewMode() {
    setViewMode($viewMode === 'grid' ? 'list' : 'grid')
  }
</script>

{#if !mini}
  <div
    data-testid="upup-header"
    data-upup-slot="header"
    class={cn(
      'upup-shadow-bottom upup-left-0 upup-right-0 upup-top-0 upup-z-10 upup-grid upup-grid-cols-4 upup-grid-rows-2 upup-items-center upup-justify-between upup-rounded-t-lg upup-bg-black/[0.025] upup-px-3 upup-py-2 md:upup-grid-rows-1',
      { 'upup-bg-white/5 dark:upup-bg-white/5': $dark },
      $slotClasses.containerHeader,
    )}
  >
    <button
      class={cn(
        'upup-max-md upup-col-start-1 upup-col-end-3 upup-row-start-2 upup-p-1 upup-text-left upup-text-sm upup-text-blue-600 md:upup-col-end-2 md:upup-row-start-1',
        { 'upup-text-[#30C5F7] dark:upup-text-[#30C5F7]': $dark },
        $slotClasses.containerCancelButton,
      )}
      onclick={handleCancel}
      disabled={$isUploading || isProcessing}
    >
      {$cancelText}
    </button>
    <span
      class={cn(
        'upup-col-span-4 upup-text-center upup-text-sm upup-text-[#6D6D6D] md:upup-col-span-2',
        { 'upup-text-gray-300 dark:upup-text-gray-300': $dark },
      )}
    >
      {#if $isAddingMore}
        {tr.addingMoreFiles}
      {/if}
      {#if !$isAddingMore}
        {t(plural(tr, 'filesSelected', $files.size), { count: $files.size })}
      {/if}
    </span>
    <div class="upup-col-start-3 upup-col-end-5 upup-flex upup-items-center upup-justify-end upup-gap-2 md:upup-col-start-4">
      {#if $files.size > 1}
        <button
          class={cn(
            'upup-flex upup-h-7 upup-w-7 upup-items-center upup-justify-center upup-rounded upup-text-gray-500 upup-transition-colors hover:upup-bg-black/10',
            { 'upup-text-gray-300 hover:upup-bg-white/10': $dark },
          )}
          onclick={toggleViewMode}
          title={$viewMode === 'grid' ? tr.switchToListView : tr.switchToGridView}
        >
          {#if $viewMode === 'grid'}
            <Icon name="layout-list" size={16} />
          {:else}
            <Icon name="layout-grid" size={16} />
          {/if}
        </button>
      {/if}
      {#if !$isAddingMore && limit > 1 && !$isLimitReached}
        <button
          class={cn(
            'upup-flex upup-items-center upup-gap-1 upup-rounded-md upup-border upup-border-dashed upup-border-blue-400/50 upup-px-2 upup-py-1 upup-text-sm upup-text-blue-600',
            { 'upup-text-[#30C5F7] dark:upup-text-[#30C5F7]': $dark },
            $slotClasses.containerAddMoreButton,
          )}
          onclick={() => setIsAddingMore(true)}
          disabled={$isUploading || isProcessing}
        >
          <ContainerAddMoreIcon /> {tr.addMore}
        </button>
      {/if}
    </div>
  </div>
{/if}
