<script lang="ts">
  import type { Readable } from 'svelte/store'
  import {
    type DriveFile,
    type DriveFolder,
    type DriveUser,
    formatUiMessage as t,
    pluralUiMessage as plural,
    searchDriveFiles,
    cn,
  } from '@upup/core'
  import {
    useUploaderI18n,
    useUploaderOptions,
    useUploaderTheme,
  } from '../../context/root-context'
  import AdapterViewContainer from './AdapterViewContainer.svelte'
  import DriveBrowserHeader from './DriveBrowserHeader.svelte'
  import DriveBrowserItem from './DriveBrowserItem.svelte'
  import ShouldRender from './ShouldRender.svelte'

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
    dataUpupSlot?: string
  } = $props()

  const { allowedFileTypes } = useUploaderOptions()
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

  const displayedItems = $derived(searchDriveFiles(items, searchTerm) || [])

  const isLoading = $derived(($isClickLoading ?? false) || !$driveFiles)

  function noopClick() { /* disabled click */ }
</script>

<AdapterViewContainer isLoading={isLoading} data-upup-slot={dataUpupSlot}>
  <ShouldRender if={true} isLoading={isLoading}>
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
      <ShouldRender if={!!$path}>
        <div
          class={cn(
            'upup-h-full upup-overflow-y-scroll upup-bg-black/[0.075] upup-pt-2',
            {
              'upup-bg-white/10 upup-text-[#fafafa] dark:upup-bg-white/10 dark:upup-text-[#fafafa]': $dark,
            },
            $slotClasses.driveBody,
          )}
        >
          <ShouldRender if={!!displayedItems.length}>
            <ul class="upup-p-2">
              {#each displayedItems as file (file.id)}
                <DriveBrowserItem
                  {file}
                  handleClick={$isClickLoading || $showLoader ? noopClick : handleClick}
                  selectedFiles={$selectedFiles}
                />
              {/each}
            </ul>
          </ShouldRender>
          <ShouldRender if={!displayedItems.length}>
            <div class="upup-flex upup-h-full upup-flex-col upup-items-center upup-justify-center">
              <p class="upup-text-xs upup-opacity-70">
                {tr.noAcceptedFilesFound}
              </p>
            </div>
          </ShouldRender>
        </div>
      </ShouldRender>

      <ShouldRender if={!!$selectedFiles.length || !!onSelectCurrentFolder}>
        <div
          class={cn(
            'upup-flex upup-origin-bottom upup-items-center upup-justify-start upup-gap-4 upup-bg-black/[0.025] upup-px-3 upup-py-2',
            {
              'upup-bg-white/5 upup-text-[#fafafa] dark:upup-bg-white/5 dark:upup-text-[#fafafa]': $dark,
            },
            $slotClasses.driveFooter,
          )}
        >
          <ShouldRender if={!!onSelectCurrentFolder}>
            <button
              class={cn(
                'upup-rounded-md upup-bg-transparent upup-px-3 upup-py-2 upup-text-sm upup-font-medium upup-text-blue-600 upup-transition-all upup-duration-300',
                {
                  'upup-text-[#30C5F7] dark:upup-text-[#30C5F7]': $dark,
                },
              )}
              disabled={$showLoader}
              onclick={() => onSelectCurrentFolder?.()}
            >
              {tr.selectThisFolder}
            </button>
          </ShouldRender>
          <button
            class={cn(
              'upup-rounded-md upup-bg-blue-600 upup-px-3 upup-py-2 upup-text-sm upup-font-medium upup-text-white upup-transition-all upup-duration-300',
              {
                'upup-animate-pulse': $showLoader,
                'upup-bg-[#30C5F7] dark:upup-bg-[#30C5F7]': $dark,
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
              'upup-ml-auto upup-rounded-md upup-p-1 upup-text-sm upup-text-blue-600 upup-transition-all upup-duration-300',
              {
                'upup-text-[#30C5F7] dark:upup-text-[#30C5F7]': $dark,
              },
              $slotClasses.driveCancelFilesButton,
            )}
            disabled={$showLoader}
            onclick={handleCancelDownload}
          >
            {tr.cancel}
          </button>
        </div>
      </ShouldRender>
    </div>
  </ShouldRender>
</AdapterViewContainer>
