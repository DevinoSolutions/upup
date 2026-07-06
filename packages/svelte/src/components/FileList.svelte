<script lang="ts">
  import { onMount } from 'svelte'
  import { get } from 'svelte/store'
  import { createVirtualizer } from '@tanstack/svelte-virtual'
  import { formatUiMessage as t, pluralUiMessage as plural, UploadStatus } from '@upup/core'
import { isUploadActive, cn } from '@upup/core/internal'
  import {
    useUploaderFiles,
    useUploaderI18n,
    useUploaderOptions,
    useUploaderSource,
    useUploaderTheme,
    useUploaderUploadControls,
    useUploaderView,
  } from '../context/uploader-context'
  import Icon from './Icon.svelte'
  import FileItem from './FileItem.svelte'
  import UploaderHeader from './shared/UploaderHeader.svelte'
  import ProgressBar from './shared/ProgressBar.svelte'

  const VIRTUAL_SCROLL_THRESHOLD = 20
  const ESTIMATED_ITEM_HEIGHT = 76

  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  function formatEta(seconds: number): string {
    if (seconds <= 0 || !isFinite(seconds)) return ''
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    if (m > 0) return `${m}m ${s}s left`
    return `${s}s left`
  }

  const { isAddingMore, viewMode } = useUploaderView()
  const { activeSource } = useUploaderSource()
  const { files } = useUploaderFiles()
  const { translations: tr } = useUploaderI18n()
  const {
    upload: {
      startUpload,
      retryUpload,
      uploadStatus,
      uploadError,
      uploadErrorCode,
      totalProgress,
      uploadSpeed,
      uploadEta,
      uploadedBytes,
      totalBytes,
    },
    handleDone,
    handleCancel,
    handlePause,
    handleResume,
  } = useUploaderUploadControls()
  const { isProcessing, resumable } = useUploaderOptions()
  const { isDark: dark, slotOverrides: slotClasses, slots: themeSlots } = useUploaderTheme()

  // Scroll element — null on SSR; set via bind:this after mount
  let scrollEl: HTMLDivElement | null = $state(null)
  let mounted = $state(false)

  // Reactive derived values
  const sortedFiles = $derived(
    Array.from($files.values()).sort((a, b) => {
      const pa = a.relativePath || a.name
      const pb = b.relativePath || b.name
      return pa.localeCompare(pb) || a.name.localeCompare(b.name)
    }),
  )

  const shouldVirtualize = $derived(
    sortedFiles.length >= VIRTUAL_SCROLL_THRESHOLD && $viewMode !== 'grid',
  )

  // Create virtualizer store — getScrollElement returns null on SSR (safe)
  // count starts at 0; we update via setOptions whenever sortedFiles or
  // shouldVirtualize changes (Svelte $effect runs client-side).
  const virtualizer = createVirtualizer<HTMLDivElement, HTMLDivElement>({
    count: 0,
    getScrollElement: () => scrollEl,
    estimateSize: () => ESTIMATED_ITEM_HEIGHT,
    overscan: 5,
    enabled: false,
  })

  // Keep virtualizer options in sync with reactive state (runs only on client).
  // CRITICAL: depend ONLY on the inputs (count/shouldVirtualize/scrollEl) and
  // push them through a NON-tracking get(virtualizer) read. We must NOT read
  // $virtualizer here: setOptions() internally calls virtualizerWritable.set(),
  // which would re-emit the derived store; if this effect were subscribed to it
  // (via $virtualizer auto-subscription) that emission would re-run the effect →
  // setOptions → emit → infinite loop. get(store) does a synchronous
  // subscribe+unsubscribe and is NOT registered as an effect dependency, so
  // writing via it cannot re-trigger this effect.
  $effect(() => {
    if (!mounted) return
    const count = sortedFiles.length // dependency: file list changes
    const sv = shouldVirtualize // dependency: virtualization gate
    void scrollEl // dependency: element binds after mount
    get(virtualizer).setOptions({
      count,
      getScrollElement: () => scrollEl,
      estimateSize: () => ESTIMATED_ITEM_HEIGHT,
      overscan: 5,
      enabled: sv,
    })
  })

  onMount(() => {
    mounted = true
  })

  function onUploadClick() {
    void startUpload().catch(() => undefined)
  }

  function onRetryClick() {
    void retryUpload().catch(() => undefined)
  }
</script>

<div
  data-testid="upup-file-list"
  data-upup-slot="file-list"
  class={cn(
    'upup-relative upup-flex upup-h-full upup-flex-col upup-rounded-lg upup-shadow',
    { 'upup-hidden': $isAddingMore || $activeSource || !$files.size },
    $themeSlots?.fileList?.root,
  )}
>
  <UploaderHeader {handleCancel} />

  <div
    bind:this={scrollEl}
    class={cn(
      'upup-preview-scroll upup-flex upup-flex-1 upup-flex-col upup-overflow-y-auto upup-bg-black/[0.075] upup-p-3',
      { 'upup-bg-white/10 dark:upup-bg-white/10': $dark },
      $slotClasses.fileListContainer,
    )}
  >
    {#if shouldVirtualize && mounted}
      <!-- Virtualized list -->
      <div
        data-upup-slot="file-list-virtual"
        style={`height: ${$virtualizer.getTotalSize()}px; position: relative;`}
        class={cn(
          isProcessing && 'upup-pointer-events-none upup-opacity-75',
          'upup-font-[Arial,Helvetica,sans-serif]',
        )}
      >
        {#each $virtualizer.getVirtualItems() as virtualItem (String(virtualItem.key))}
          {@const file = sortedFiles[virtualItem.index]}
          {#if file}
            <div
              data-index={virtualItem.index}
              style={`position: absolute; top: 0; left: 0; width: 100%; transform: translateY(${virtualItem.start}px); padding-bottom: 12px;`}
            >
              <FileItem {file} />
            </div>
          {/if}
        {/each}
      </div>
    {:else}
      <!-- Standard rendering -->
      <div
        class={cn(
          `${isProcessing ? 'upup-pointer-events-none upup-opacity-75' : ''} upup-flex upup-flex-col upup-gap-3 upup-font-[Arial,Helvetica,sans-serif]`,
          {
            'md:upup-grid md:upup-gap-y-6': $files.size > 1 && $viewMode === 'grid',
            'md:upup-grid-cols-2': $files.size > 1 && $viewMode === 'grid',
            'upup-flex-1': $files.size === 1,
            [$slotClasses.fileListContainerInnerMultiple ?? '']:
              !!$slotClasses.fileListContainerInnerMultiple && $files.size > 1,
            [$slotClasses.fileListContainerInnerSingle ?? '']:
              !!$slotClasses.fileListContainerInnerSingle && $files.size === 1,
          },
        )}
      >
        {#each sortedFiles as file (file.id)}
          <FileItem {file} />
        {/each}
      </div>
    {/if}
  </div>

  <div
    class={cn(
      'upup-shadow-top upup-flex upup-items-center upup-gap-3 upup-rounded-b-lg upup-bg-black/[0.025] upup-px-3 upup-py-2',
      { 'upup-bg-white/5 dark:upup-bg-white/5': $dark },
      $slotClasses.fileListFooter,
    )}
  >
    {#if $uploadStatus !== UploadStatus.SUCCESSFUL && $uploadStatus !== UploadStatus.FAILED}
      <button
        data-testid="upup-upload-btn"
        class={cn(
          'upup-disabled:animate-pulse upup-ml-auto upup-rounded-full upup-bg-blue-600 upup-px-4 upup-py-2 upup-text-sm upup-font-medium upup-text-white',
          { 'upup-bg-[#30C5F7] dark:upup-bg-[#30C5F7]': $dark },
          $slotClasses.uploadButton,
        )}
        onclick={onUploadClick}
        disabled={isUploadActive($uploadStatus) || $uploadStatus === UploadStatus.PAUSED || isProcessing}
      >
        {t(plural(tr, 'uploadFiles', $files.size), { count: $files.size })}
      </button>
    {/if}

    {#if $uploadStatus === UploadStatus.FAILED && $uploadError}
      <p
        data-testid="upup-upload-error"
        data-upup-slot="upload-error"
        title={$uploadErrorCode}
        class="upup-mr-auto upup-text-sm upup-text-red-600 dark:upup-text-red-400"
      >
        {$uploadErrorCode ? t(tr.uploadFailedWithCode, { code: $uploadErrorCode }) : t(tr.uploadFailed, { message: $uploadError })}
      </p>
    {/if}

    {#if $uploadStatus === UploadStatus.FAILED}
      <button
        data-testid="upup-retry-btn"
        class={cn(
          'upup-disabled:animate-pulse upup-ml-auto upup-rounded-full upup-bg-red-600 upup-px-4 upup-py-2 upup-text-sm upup-font-medium upup-text-white',
          { 'upup-bg-red-500 dark:upup-bg-red-500': $dark },
          $slotClasses.uploadButton,
        )}
        onclick={onRetryClick}
      >
        {resumable?.protocol === 'multipart' ? tr.resumeUpload : tr.retryUpload}
      </button>
    {/if}

    {#if $uploadStatus === UploadStatus.SUCCESSFUL}
      <button
        class={cn(
          'upup-disabled:animate-pulse upup-ml-auto upup-rounded-lg upup-bg-blue-600 upup-px-3 upup-py-2 upup-text-sm upup-font-medium upup-text-white',
          { 'upup-bg-[#30C5F7] dark:upup-bg-[#30C5F7]': $dark },
          $slotClasses.uploadDoneButton,
        )}
        onclick={handleDone}
      >
        {tr.done}
      </button>
    {/if}

    <div class="upup-flex upup-flex-1 upup-flex-col upup-gap-1">
      <div class="upup-flex upup-items-center upup-gap-2">
        {#if resumable?.protocol === 'multipart' && (isUploadActive($uploadStatus) || $uploadStatus === UploadStatus.PAUSED)}
          <button
            data-testid="upup-upload-pause-toggle"
            class={cn(
              'upup-flex upup-h-7 upup-w-7 upup-items-center upup-justify-center upup-rounded-full upup-bg-gray-200 upup-text-gray-700 upup-transition-colors hover:upup-bg-gray-300',
              { 'upup-bg-white/10 upup-text-white hover:upup-bg-white/20': $dark },
            )}
            onclick={() => $uploadStatus === UploadStatus.PAUSED ? handleResume() : handlePause()}
            aria-label={$uploadStatus === UploadStatus.PAUSED ? tr.resumeUpload : tr.pauseUpload}
            title={$uploadStatus === UploadStatus.PAUSED ? tr.resumeUpload : tr.pauseUpload}
          >
            {#if $uploadStatus === UploadStatus.PAUSED}
              <Icon name="player-play" size={14} />
            {:else}
              <Icon name="player-pause" size={14} />
            {/if}
          </button>
          <button
            data-testid="upup-upload-cancel-btn"
            class={cn(
              'upup-flex upup-h-7 upup-w-7 upup-items-center upup-justify-center upup-rounded-full upup-bg-red-100 upup-text-red-700 upup-transition-colors hover:upup-bg-red-200',
              { 'upup-bg-red-500/20 upup-text-red-100 hover:upup-bg-red-500/30': $dark },
            )}
            onclick={handleCancel}
            aria-label={tr.cancel}
            title={tr.cancel}
          >
            <Icon name="x" size={14} />
          </button>
        {/if}
        <ProgressBar
          class="upup-flex-1"
          progressBarClassName="upup-rounded"
          progress={$totalProgress}
          showValue={true}
        />
      </div>

      {#if (isUploadActive($uploadStatus) || $uploadStatus === UploadStatus.PAUSED) && $totalBytes > 0}
        <div
          class={cn(
            'upup-flex upup-items-center upup-justify-between upup-text-[11px] upup-text-gray-500',
            { 'upup-text-gray-400': $dark },
          )}
        >
          <span>
            {formatBytes($uploadedBytes)} of {formatBytes($totalBytes)}
            {#if $uploadSpeed > 0}
              &middot; {formatBytes($uploadSpeed)}/s
            {/if}
          </span>
          {#if isUploadActive($uploadStatus) && $uploadEta > 0}
            <span>{formatEta($uploadEta)}</span>
          {/if}
          {#if $uploadStatus === UploadStatus.PAUSED}
            <span>{tr.paused}</span>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</div>
