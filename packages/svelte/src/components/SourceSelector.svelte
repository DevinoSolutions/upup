<script lang="ts">
  import { formatUiMessage as t, pluralUiMessage as plural } from '@upup/core'
import { cn } from '@upup/core/internal'
  import {
    useUploaderFiles,
    useUploaderI18n,
    useUploaderOptions,
    useUploaderRuntime,
    useUploaderTheme,
    useUploaderView,
  } from '../context/uploader-context'
  import useSourceSelector from '../composables/useSourceSelector'
  import Icon from './Icon.svelte'

  const { core, getFileInput, openFilePicker } = useUploaderRuntime()
  const { translations: tr } = useUploaderI18n()
  const { isAddingMore, setIsAddingMore } = useUploaderView()
  const { setFiles } = useUploaderFiles()
  const { isDark: dark, slotOverrides: slotClasses } = useUploaderTheme()
  const {
    mini,
    allowedFileTypes,
    limit,
    maxFileSize,
    folderPickerButtonVisible,
  } = useUploaderOptions()

  const constraintLine = (() => {
    const parts: string[] = []
    if (allowedFileTypes && allowedFileTypes !== '*/*' && allowedFileTypes !== '*') {
      const humanized = allowedFileTypes
        .split(',')
        .map((s) => s.trim())
        .map((m) => {
          if (m.startsWith('.')) return m
          const [type, sub] = m.split('/')
          if (sub === '*') return type.charAt(0).toUpperCase() + type.slice(1) + 's'
          return sub.toUpperCase()
        })
        .join(', ')
      parts.push(humanized + ' only')
    }
    if (limit > 1) {
      parts.push(t(tr.addDocumentsHere, { limit }))
    }
    if (maxFileSize?.size && maxFileSize?.unit) {
      parts.push(
        t(plural(tr, 'maxFileSizeAllowed', limit), {
          size: maxFileSize.size,
          unit: maxFileSize.unit,
        }),
      )
    }
    return parts.join(', ')
  })()

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

  function onSourceKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') e.preventDefault()
  }
</script>

<div
  data-testid="upup-source-selector"
  data-upup-slot="source-selector"
  class={cn(
    'upup-relative upup-flex upup-h-full upup-gap-3 upup-rounded-lg',
    {
      'upup-flex-col': $isAddingMore,
      'upup-flex-col-reverse upup-items-center upup-justify-center md:upup-flex-col md:upup-gap-14': !$isAddingMore,
    },
  )}
>
  {#if $isAddingMore}
    <div
      class={cn(
        'upup-shadow-bottom upup-flex upup-w-full upup-items-center upup-rounded-t-lg upup-bg-black/[0.025] upup-px-3 upup-py-2',
        { 'upup-bg-white/5 dark:upup-bg-white/5': $dark },
        $slotClasses.containerHeader,
      )}
    >
      <button
        class={cn(
          'upup-flex upup-items-center upup-gap-1 upup-text-sm upup-font-medium upup-text-blue-600',
          { 'upup-text-[#30C5F7] dark:upup-text-[#30C5F7]': $dark },
          $slotClasses.containerCancelButton,
        )}
        onclick={() => setIsAddingMore(false)}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back
      </button>
      <span
        class={cn(
          'upup-flex-1 upup-text-center upup-text-sm upup-text-[#6D6D6D]',
          { 'upup-text-gray-300 dark:upup-text-gray-300': $dark },
        )}
      >
        Adding more files
      </span>
    </div>
  {/if}

  {#if !mini}
    <div
      class={cn(
        'upup-flex upup-w-full upup-flex-col upup-justify-center upup-gap-1 md:upup-flex-row md:upup-flex-wrap md:upup-items-center md:upup-gap-[30px] md:upup-px-[30px]',
        $slotClasses.sourceButtonList,
      )}
    >
      {#each chosenSources as { Icon, id, name } (id)}
        <button
          type="button"
          data-testid={`upup-source-${id}`}
          class={cn(
            'upup-group upup-flex upup-items-center upup-gap-[6px] upup-border-b upup-border-gray-200 upup-px-2 upup-py-1 md:upup-flex-col md:upup-justify-center md:upup-rounded-lg md:upup-border-none md:upup-p-0',
            { 'upup-border-[#6D6D6D] dark:upup-border-[#6D6D6D]': $dark },
            $slotClasses.sourceButton,
          )}
          onkeydown={onSourceKeydown}
          onclick={() => handleSourceClick(id)}
        >
          <Icon class={$slotClasses.sourceButtonIcon || undefined} />
          <span
            class={cn(
              'upup-text-xs upup-text-[#242634]',
              { 'upup-text-gray-300 dark:upup-text-gray-300': $dark },
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
  {:else}
    <div class="upup-flex upup-flex-col upup-items-center upup-gap-1 upup-px-3 upup-text-center md:upup-gap-2 md:upup-px-[30px]">
      <div class="upup-flex upup-flex-wrap upup-items-center upup-justify-center upup-gap-1">
        <span
          class={cn(
            'upup-text-xs upup-text-[#0B0B0B] md:upup-text-sm',
            { 'upup-text-white dark:upup-text-white': $dark },
          )}
        >
          {limit > 1 ? tr.dragFilesOr : tr.dragFileOr}
        </span>
        <button
          type="button"
          data-testid="upup-browse-files"
          class={cn(
            'upup-cursor-pointer upup-text-xs upup-font-semibold upup-text-[#0E2ADD] md:upup-text-sm',
            { 'upup-text-[#59D1F9] dark:upup-text-[#59D1F9]': $dark },
          )}
          onclick={handleBrowseFilesClick}
        >
          {tr.browseFiles}
        </button>
        {#if folderPickerButtonVisible}
          <span
            class={cn(
              'upup-text-xs upup-text-[#0B0B0B] md:upup-text-sm',
              { 'upup-text-white dark:upup-text-white': $dark },
            )}
          >
            {' '}{tr.or}
          </span>
          <button
            type="button"
            class={cn(
              'upup-cursor-pointer upup-text-xs upup-font-semibold upup-text-[#0E2ADD] md:upup-text-sm',
              { 'upup-text-[#59D1F9] dark:upup-text-[#59D1F9]': $dark },
            )}
            onclick={handleSelectFolderClick}
          >
            {tr.selectAFolder}
          </button>
        {/if}
      </div>
      {#if constraintLine}
        <p
          class={cn(
            'upup-text-center upup-text-xs upup-text-[#6D6D6D] md:upup-text-sm',
            { 'upup-text-gray-300 dark:upup-text-gray-300': $dark },
          )}
        >
          {constraintLine}
        </p>
      {/if}
    </div>
  {/if}
</div>
