<script lang="ts">
  import { formatUiMessage as t, pluralUiMessage as plural } from '@upupjs/core'
import { cn } from '@upupjs/core/internal'
  import {
    useUploaderFiles,
    useUploaderI18n,
    useUploaderOptions,
    useUploaderRuntime,
    useUploaderTheme,
  } from '../context/uploader-context'
  import useSourceSelector from '../composables/useSourceSelector'
  import Icon from './Icon.svelte'

  const { core, getFileInput, openFilePicker } = useUploaderRuntime()
  const { translations: tr } = useUploaderI18n()
  const { setFiles } = useUploaderFiles()
  const { isDark: dark, slotOverrides: slotClasses } = useUploaderTheme()
  const {
    mini,
    allowedFileTypes,
    limit,
    maxFileSize,
    folderPickerButtonVisible,
  } = useUploaderOptions()

  // Idle limits caption (data-upup-slot="limits-caption"): iconified file-count
  // and per-file size limits, plus a leading text-only type-restriction segment
  // so no constraint the consumer configured is dropped.
  const typeConstraint = (() => {
    if (allowedFileTypes && allowedFileTypes !== '*/*' && allowedFileTypes !== '*') {
      const humanized = allowedFileTypes
        .split(',')
        .map((s) => s.trim())
        .map((m) => {
          if (m.startsWith('.')) return m
          const [type, sub] = m.split('/')
          if (!type || !sub) return m
          if (sub === '*') return type.charAt(0).toUpperCase() + type.slice(1) + 's'
          return sub.toUpperCase()
        })
        .join(', ')
      return humanized + ' only'
    }
    return null
  })()
  const showFilesLimit = limit > 1
  const showSizeLimit = !!(maxFileSize?.size && maxFileSize?.unit)
  const hasLimitsCaption = !!typeConstraint || showFilesLimit || showSizeLimit

  const { chosenSources, handleSourceClick } = useSourceSelector()

  function handleBrowseFilesClick() {
    const el = getFileInput()
    if (el) {
      el.removeAttribute('webkitdirectory')
      el.removeAttribute('directory')
    }
    openFilePicker()
    core?.emit('browse-files', {})
  }

  async function handleSelectFolderClick() {
    const fsWindow = window as Window & { showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle> }
    if (fsWindow.showDirectoryPicker) {
      try {
        const directoryHandle = await fsWindow.showDirectoryPicker()
        const collectedFiles: File[] = []

        type IterableDirHandle = { values(): AsyncIterableIterator<FileSystemHandle & { kind: string; getFile: () => Promise<File> }> }
        async function getFiles(dirHandle: IterableDirHandle, path = '') {
          for await (const entry of dirHandle.values()) {
            const newPath = path ? `${path}/${entry.name}` : entry.name
            if (entry.kind === 'file') {
              const pickedFile = await entry.getFile()
              const file = new File(
                [await pickedFile.arrayBuffer()],
                pickedFile.name,
                { type: pickedFile.type, lastModified: pickedFile.lastModified },
              )
              try {
                Object.defineProperty(file, 'webkitRelativePath', {
                  value: newPath, configurable: true, writable: true,
                })
                Object.defineProperty(file, 'relativePath', {
                  value: newPath, configurable: true, writable: true,
                })
              } catch {
                Object.assign(file, { relativePath: newPath })
              }
              collectedFiles.push(file)
            } else if (entry.kind === 'directory') {
              await getFiles(entry as unknown as IterableDirHandle, newPath)
            }
          }
        }
        await getFiles(directoryHandle as unknown as IterableDirHandle)
        if (collectedFiles.length > 0) {
          setFiles(collectedFiles)
          core?.emit('folder-select', { count: collectedFiles.length })
          const el = getFileInput()
          if (el) el.value = ''
        }
      } catch (error) {
        const name = error instanceof DOMException ? error.name : ''
        if (name !== 'AbortError') throw error
      }
    } else {
      const el = getFileInput()
      if (el) {
        el.setAttribute('webkitdirectory', 'true')
        el.setAttribute('directory', 'true')
      }
      openFilePicker()
      core?.emit('folder-select', { count: 0 })
    }
  }
</script>

<div
  data-testid="upup-source-selector"
  data-upup-slot="source-selector"
  class="upup-animate-fx-view upup-relative upup-flex upup-h-full upup-flex-col upup-items-center upup-justify-center upup-gap-6 upup-rounded-lg upup-px-4 upup-py-6"
>
  {#if !mini}
    <div
      class={cn(
        'upup-flex upup-flex-wrap upup-items-center upup-justify-center upup-gap-x-1.5 upup-gap-y-1 upup-px-2 upup-text-center upup-text-base upup-font-medium md:upup-text-lg',
        {
          'upup-text-[#242634]': !$dark,
          'upup-text-[#e2e8f0] dark:upup-text-[#e2e8f0]': $dark,
        },
      )}
    >
      <span>{tr.dropFilesHere}</span>
      <button
        type="button"
        data-testid="upup-browse-files"
        class={cn(
          'upup-cursor-pointer upup-rounded upup-font-semibold focus-visible:upup-outline-none focus-visible:upup-ring-2 focus-visible:upup-ring-[#38bdf8]',
          {
            'upup-text-[#0284c7]': !$dark,
            'upup-text-[#38bdf8] dark:upup-text-[#38bdf8]': $dark,
          },
        )}
        onclick={handleBrowseFilesClick}
      >
        {tr.browseFiles}
      </button>
      {#if folderPickerButtonVisible}
        <span>{tr.or}</span>
        <button
          type="button"
          class={cn(
            'upup-cursor-pointer upup-rounded upup-font-semibold focus-visible:upup-outline-none focus-visible:upup-ring-2 focus-visible:upup-ring-[#38bdf8]',
            {
              'upup-text-[#0284c7]': !$dark,
              'upup-text-[#38bdf8] dark:upup-text-[#38bdf8]': $dark,
            },
          )}
          onclick={handleSelectFolderClick}
        >
          {tr.selectAFolder}
        </button>
      {/if}
      <span>{tr.orImportFrom}</span>
    </div>
    <div
      class={cn(
        'upup-flex upup-max-w-[420px] upup-flex-wrap upup-items-start upup-justify-center upup-gap-x-6 upup-gap-y-5',
        $slotClasses.sourceButtonList,
      )}
    >
      {#each chosenSources as { Icon: SourceIcon, id, name } (id)}
        <button
          type="button"
          data-testid={`upup-source-${id}`}
          class={cn(
            'upup-fx-hover-lift upup-fx-press upup-fx-icon-nudge upup-group upup-flex upup-w-[66px] upup-cursor-pointer upup-flex-col upup-items-center upup-gap-[9px] upup-rounded-[14px] focus-visible:upup-outline-none focus-visible:upup-ring-2 focus-visible:upup-ring-[#38bdf8] hover:upup-shadow-none',
            $slotClasses.sourceButton,
          )}
          onclick={() => handleSourceClick(id)}
        >
          <span
            class={cn(
              'upup-flex upup-h-[52px] upup-w-[52px] upup-items-center upup-justify-center upup-rounded-[14px] upup-ring-1 upup-transition-colors',
              {
                'upup-bg-white upup-ring-black/[0.07] group-hover:upup-bg-slate-50': !$dark,
                'upup-bg-white/[0.055] upup-ring-white/[0.06] group-hover:upup-bg-white/[0.09] dark:upup-bg-white/[0.055] dark:upup-ring-white/[0.06]': $dark,
              },
            )}
          >
            <SourceIcon class={cn('upup-h-10 upup-w-10', $slotClasses.sourceButtonIcon)} />
          </span>
          <span
            class={cn(
              'upup-text-xs upup-leading-none',
              {
                'upup-text-[#6D6D6D]': !$dark,
                'upup-text-[#94a3b8] dark:upup-text-[#94a3b8]': $dark,
              },
              $slotClasses.sourceButtonText,
            )}
          >
            {name}
          </span>
        </button>
      {/each}
    </div>
  {/if}

  {#if mini}
    <button
      type="button"
      onclick={handleBrowseFilesClick}
      class="upup-flex upup-cursor-pointer upup-flex-col upup-items-center upup-justify-center upup-gap-2 upup-rounded-lg upup-p-2"
    >
      <Icon
        name="upload"
        size={32}
        class={cn(
          'upup-h-16 upup-w-16 md:upup-h-20 md:upup-w-20',
          {
            'upup-text-[#0B0B0B]': !$dark,
            'upup-text-white dark:upup-text-white': $dark,
          },
        )}
      />
      <p
        class={cn('px-6 upup-text-center upup-text-xs', {
          'upup-text-[#6D6D6D] dark:upup-text-gray-400': !$dark,
          'upup-text-gray-400 dark:upup-text-gray-500': $dark,
        })}
      >
        Drag or browse to upload
      </p>
    </button>
  {:else if hasLimitsCaption}
    <div
      data-upup-slot="limits-caption"
      class={cn(
        'upup-flex upup-flex-wrap upup-items-center upup-justify-center upup-gap-x-2.5 upup-gap-y-1 upup-px-3 upup-text-center upup-text-xs',
        {
          'upup-text-[#6D6D6D]': !$dark,
          'upup-text-[#94a3b8] dark:upup-text-[#94a3b8]': $dark,
        },
      )}
    >
      {#if typeConstraint}
        <span>{typeConstraint}</span>
      {/if}
      {#if typeConstraint && (showFilesLimit || showSizeLimit)}
        <span aria-hidden="true">&middot;</span>
      {/if}
      {#if showFilesLimit}
        <span class="upup-inline-flex upup-items-center upup-gap-1.5">
          <span aria-hidden="true" class="upup-inline-flex">
            <Icon name="stacked-files" class="upup-h-4 upup-w-4" />
          </span>
          {t(plural(tr, 'filesMax', limit), { count: limit })}
        </span>
      {/if}
      {#if showFilesLimit && showSizeLimit}
        <span aria-hidden="true">&middot;</span>
      {/if}
      {#if showSizeLimit}
        <span class="upup-inline-flex upup-items-center upup-gap-1.5">
          <span aria-hidden="true" class="upup-inline-flex">
            <Icon name="storage" class="upup-h-4 upup-w-4" />
          </span>
          {t(tr.sizeEach, { size: maxFileSize?.size ?? 0, unit: maxFileSize?.unit ?? '' })}
        </span>
      {/if}
    </div>
  {/if}
</div>
