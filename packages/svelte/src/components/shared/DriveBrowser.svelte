<script lang="ts">
  import type { Readable } from 'svelte/store'
  import { type DriveBrowserError, type DriveFile, type DriveFolder, type DriveUser, formatUiMessage as t, pluralUiMessage as plural } from '@upupjs/core'
import { searchDriveFiles, cn } from '@upupjs/core/internal'
  import {
    useUploaderI18n,
    useUploaderOptions,
    useUploaderTheme,
  } from '../../context/uploader-context'
  import SourceViewContainer from './SourceViewContainer.svelte'
  import DriveBrowserHeader from './DriveBrowserHeader.svelte'
  import DriveBrowserItem from './DriveBrowserItem.svelte'

  const {
    isClickLoading,
    driveFiles,
    path,
    setPath,
    user,
    handleSignOut,
    handleClick,
    selectedFiles,
    showLoader,
    handleSubmit,
    handleCancelDownload,
    onSelectCurrentFolder,
    error,
    hasMore,
    isLoadingMore,
    loadMore,
    dataUpupSlot = 'drive-browser',
  }: {
    isClickLoading?: Readable<boolean>
    driveFiles?: Readable<DriveFolder | undefined>
    path: Readable<DriveFolder[]>
    setPath: (newPath: DriveFolder[]) => void
    user?: Readable<DriveUser | undefined>
    handleSignOut: () => Promise<void>
    handleClick: (file: DriveFile) => void | Promise<void>
    selectedFiles: Readable<DriveFile[]>
    showLoader: Readable<boolean>
    handleSubmit: () => Promise<void>
    handleCancelDownload: () => void
    onSelectCurrentFolder?: () => Promise<void> | void
    error?: Readable<DriveBrowserError | undefined>
    hasMore?: Readable<boolean>
    isLoadingMore?: Readable<boolean>
    loadMore?: () => void | Promise<void>
    dataUpupSlot?: string
  } = $props()

  const { allowedFileTypes, icons } = useUploaderOptions()
  const Loader = icons.LoaderIcon
  const { isDark: dark, slotOverrides: slotClasses } = useUploaderTheme()
  const { translations: tr } = useUploaderI18n()
  let searchTerm = $state('')

  function filterItems(item: DriveFile, accept: string) {
    if (item.isFolder) return true
    if (!accept || accept === '*') return true
    return accept.split(',').some((pattern) => {
      const p = pattern.trim()
      if (p.startsWith('.')) return item.name.endsWith(p)
      if (p.endsWith('/*')) return item.mimeType.startsWith(p.replace('/*', '/'))
      return item.mimeType === p
    })
  }

  const items = $derived(
    $path[$path.length - 1]?.children?.filter((item) =>
      filterItems(item, allowedFileTypes),
    ),
  )

  const displayedItems = $derived(searchDriveFiles(items ?? [], searchTerm) || [])

  // error short-circuits the perpetual loader — the exact F-123/F-124 symptom.
  const isLoading = $derived(!$error && (($isClickLoading ?? false) || !$driveFiles))

  function noopClick() { /* disabled click */ }
</script>

<SourceViewContainer isLoading={isLoading} data-upup-slot={dataUpupSlot}>
  {#if isLoading}
    <Loader />
  {:else}
    <div data-testid="upup-drive-browser" class="upup-grid upup-h-full upup-w-full upup-grid-rows-[auto,1fr,auto] upup-overflow-auto">
      <DriveBrowserHeader
        showSearch={!!items?.length}
        path={$path}
        {setPath}
        {searchTerm}
        onSearch={(v) => (searchTerm = v)}
        user={$user}
        {handleSignOut}
      />
      {#if !!$path}
        <div
          class={cn(
            'upup-h-full upup-overflow-y-auto upup-pt-2',
            {
              'upup-text-[#fafafa] dark:upup-text-[#fafafa]': $dark,
            },
            $slotClasses.driveBody,
          )}
        >
          {#if !!$error}
            <div class="upup-flex upup-h-full upup-flex-col upup-items-center upup-justify-center upup-px-6 upup-text-center">
              <p
                data-testid="upup-drive-error"
                data-upup-slot="drive-error"
                role="alert"
                class="upup-text-sm upup-text-red-600 dark:upup-text-red-400"
              >
                {t(tr.driveLoadError, { message: $error.message })}
              </p>
            </div>
          {/if}
          {#if !!displayedItems.length}
            <ul class="upup-p-2">
              {#each displayedItems as file (file.id)}
                <DriveBrowserItem
                  {file}
                  handleClick={$isClickLoading || $showLoader ? noopClick : handleClick}
                  selectedFiles={$selectedFiles}
                />
              {/each}
            </ul>
          {/if}
          {#if !displayedItems.length && !$error}
            <div class="upup-flex upup-h-full upup-flex-col upup-items-center upup-justify-center">
              <p class="upup-text-xs upup-opacity-70">
                {tr.noAcceptedFilesFound}
              </p>
            </div>
          {/if}
          {#if !!$hasMore}
            <button
              data-testid="upup-drive-load-more"
              data-upup-slot="drive-load-more"
              class="upup-mx-auto upup-my-2 upup-block upup-rounded-md upup-px-3 upup-py-1.5 upup-text-sm upup-text-[#0284c7] disabled:upup-opacity-50"
              disabled={$isLoadingMore}
              onclick={() => loadMore?.()}
            >
              {$isLoadingMore ? tr.loading : tr.loadMore}
            </button>
          {/if}
        </div>
      {/if}

      {#if (!!$selectedFiles.length || !!onSelectCurrentFolder) && !$error}
        <div
          class={cn(
            'upup-flex upup-origin-bottom upup-items-center upup-justify-start upup-gap-4 upup-border-t upup-px-3 upup-py-2',
            $dark
              ? 'upup-border-white/[0.08] upup-text-[#fafafa]'
              : 'upup-border-black/[0.06]',
            $slotClasses.driveFooter,
          )}
        >
          {#if !!onSelectCurrentFolder}
            <button
              class={cn(
                'upup-rounded-md upup-bg-transparent upup-px-3 upup-py-2 upup-text-sm upup-font-medium upup-text-[#0284c7] upup-transition-all upup-duration-300',
                {
                  'upup-text-[#38bdf8] dark:upup-text-[#38bdf8]': $dark,
                },
              )}
              disabled={$showLoader}
              onclick={() => onSelectCurrentFolder?.()}
            >
              {tr.selectThisFolder}
            </button>
          {/if}
          <button
            class={cn(
              'upup-rounded-md upup-bg-[#0ea5e9] upup-px-3 upup-py-2 upup-text-sm upup-font-medium upup-text-white upup-transition-all upup-duration-300',
              {
                'upup-animate-pulse': $showLoader,
                'upup-bg-[#38bdf8] dark:upup-bg-[#38bdf8]': $dark,
              },
              $slotClasses.driveAddFilesButton,
            )}
            disabled={$showLoader}
            onclick={handleSubmit}
          >
            {t(
              plural(tr, 'addFiles', $selectedFiles.length),
              { count: $selectedFiles.length },
            )}
          </button>
          <button
            class={cn(
              'upup-ml-auto upup-rounded-md upup-p-1 upup-text-sm upup-text-[#0284c7] upup-transition-all upup-duration-300',
              {
                'upup-text-[#38bdf8] dark:upup-text-[#38bdf8]': $dark,
              },
              $slotClasses.driveCancelFilesButton,
            )}
            disabled={$showLoader}
            onclick={handleCancelDownload}
          >
            {tr.cancel}
          </button>
        </div>
      {/if}
    </div>
  {/if}
</SourceViewContainer>
