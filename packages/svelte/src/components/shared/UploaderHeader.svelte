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

  let {
    handleCancel,
    forcedList = false,
    hideAddMore = false,
  }: {
    handleCancel: () => void
    /** True when the panel forces the row list (tiles don't fit one row) —
     *  the grid/list toggle is hidden in that state. */
    forcedList?: boolean
    /** True in quiet-completion mode after success — hides the add-more
     *  control so the completed panel offers no further CTAs. */
    hideAddMore?: boolean
  } = $props()

  const { files } = useUploaderFiles()
  const { viewMode, setViewMode, openSourceOverlay } = useUploaderView()
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
        'upup-max-md upup-col-start-1 upup-col-end-3 upup-row-start-2 upup-p-1 upup-text-left upup-text-sm upup-text-[#0284c7] md:upup-col-end-2 md:upup-row-start-1',
        { 'upup-text-[#38bdf8] dark:upup-text-[#38bdf8]': $dark },
        $slotClasses.containerCancelButton,
      )}
      onclick={handleCancel}
      disabled={$isUploading || isProcessing}
    >
      {tr.removeAllFiles}
    </button>
    <span
      class={cn(
        'upup-col-span-4 upup-text-center upup-text-sm upup-text-[#6D6D6D] md:upup-col-span-2',
        { 'upup-text-gray-300 dark:upup-text-gray-300': $dark },
      )}
    >
      {t(plural(tr, 'filesSelected', $files.size), { count: $files.size })}
    </span>
    <div class="upup-col-start-3 upup-col-end-5 upup-flex upup-items-center upup-justify-end upup-gap-2 md:upup-col-start-4">
      <!-- Two-segment grid|list control. Hidden once the row list is
           forced (tiles don't fit one row of the fixed panel). The
           active segment carries the sky highlight; both segments
           always show their icon so the choice is self-evident. -->
      {#if $files.size > 1 && !forcedList}
        <div
          role="group"
          aria-label={tr.switchToGridView}
          data-upup-slot="view-toggle"
          class={cn(
            'upup-flex upup-items-center upup-gap-0.5 upup-rounded-lg upup-p-0.5',
            $dark ? 'upup-bg-white/[0.06]' : 'upup-bg-black/[0.05]',
          )}
        >
          <button
            data-testid="upup-view-toggle-grid"
            aria-label={tr.switchToGridView}
            aria-pressed={$viewMode === 'grid'}
            title={tr.switchToGridView}
            class={cn(
              'upup-flex upup-h-6 upup-items-center upup-justify-center upup-gap-1 upup-rounded-md upup-px-1.5 upup-transition-colors',
              $viewMode === 'grid'
                ? 'upup-bg-[#0ea5e9] upup-text-white'
                : $dark
                  ? 'upup-text-gray-300 hover:upup-bg-white/10'
                  : 'upup-text-gray-500 hover:upup-bg-black/10',
            )}
            onclick={() => setViewMode('grid')}
          >
            <Icon name="layout-grid" size={15} />
            <!-- Label only on the ACTIVE segment, and only at md+
                 where the header has room (mini shows no header at
                 all). Inactive segment stays icon-only. -->
            {#if $viewMode === 'grid'}
              <span class="upup-hidden upup-text-xs upup-font-medium upup-leading-none md:upup-inline">
                {tr.viewGrid}
              </span>
            {/if}
          </button>
          <button
            data-testid="upup-view-toggle-list"
            aria-label={tr.switchToListView}
            aria-pressed={$viewMode === 'list'}
            title={tr.switchToListView}
            class={cn(
              'upup-flex upup-h-6 upup-items-center upup-justify-center upup-gap-1 upup-rounded-md upup-px-1.5 upup-transition-colors',
              $viewMode === 'list'
                ? 'upup-bg-[#0ea5e9] upup-text-white'
                : $dark
                  ? 'upup-text-gray-300 hover:upup-bg-white/10'
                  : 'upup-text-gray-500 hover:upup-bg-black/10',
            )}
            onclick={() => setViewMode('list')}
          >
            <Icon name="layout-list" size={15} />
            {#if $viewMode === 'list'}
              <span class="upup-hidden upup-text-xs upup-font-medium upup-leading-none md:upup-inline">
                {tr.viewList}
              </span>
            {/if}
          </button>
        </div>
      {/if}
      {#if limit > 1 && !$isLimitReached && !hideAddMore}
        <button
          data-testid="upup-add-more"
          data-placement="header"
          data-upup-slot="add-more"
          class={cn(
            'upup-fx-hover-lift upup-fx-press upup-inline-flex upup-shrink-0 upup-items-center upup-gap-1 upup-whitespace-nowrap upup-rounded-md upup-border upup-border-dashed upup-border-[#38bdf8]/50 upup-px-2 upup-py-1 upup-text-sm upup-leading-none upup-text-[#0284c7]',
            { 'upup-text-[#38bdf8] dark:upup-text-[#38bdf8]': $dark },
            $slotClasses.containerAddMoreButton,
          )}
          onclick={openSourceOverlay}
          disabled={$isUploading || isProcessing}
        >
          <ContainerAddMoreIcon /> {tr.addMore}
        </button>
      {/if}
    </div>
  </div>
{/if}
