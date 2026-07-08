<script lang="ts">
  import { get } from 'svelte/store'
  import type { Translations } from '@upup/core'
  import { fileCanPreviewText, fileGetIsImage, fileGetIsPdf, fileGetIsText, cn } from '@upup/core/internal'
  import {
    useUploaderEditor,
    useUploaderFiles,
    useUploaderI18n,
    useUploaderOptions,
    useUploaderTheme,
    useUploaderUploadControls,
  } from '../context/uploader-context'
  import FilePreviewThumbnail from './FilePreviewThumbnail.svelte'
  import ProgressBar from './shared/ProgressBar.svelte'

  let {
    fileName,
    fileType,
    fileId,
    fileUrl,
    fileSize,
    canPreview,
    onRequestPreview,
    onUpdateCanPreview,
    onclick,
  }: {
    fileName: string
    fileType: string
    fileId: string
    fileUrl: string
    fileSize?: number
    canPreview: boolean
    onRequestPreview?: () => void
    onUpdateCanPreview?: (val: boolean) => void
    onclick?: () => void
  } = $props()

  const { handleFileRemove, files } = useUploaderFiles()
  const { translations: tr } = useUploaderI18n()
  const { openImageEditor } = useUploaderEditor()
  const { upload: { filesProgressMap } } = useUploaderUploadControls()
  const {
    icons: { FileDeleteIcon },
    allowPreview,
    imageEditor,
  } = useUploaderOptions()
  const {
    isDark: isDarkTheme,
    slotOverrides: slotClasses,
    slots: themeSlots,
  } = useUploaderTheme()

  const isImage = $derived(fileGetIsImage(fileType))
  const isPdf = $derived(fileGetIsPdf(fileType, fileName))
  const isText = $derived(fileGetIsText(fileType, fileName))
  const canPreviewText = $derived(fileCanPreviewText(fileType, fileName, fileSize))

  // Auto-signal canPreview when applicable
  $effect(() => {
    if ((isImage || isPdf || (isText && canPreviewText)) && !canPreview) {
      onUpdateCanPreview?.(true)
    }
  })

  const progress = $derived.by(() => {
    const fileProgress = $filesProgressMap[fileId]
    if (!fileProgress) return NaN
    return Math.floor((fileProgress.loaded / fileProgress.total) * 100)
  })

  function formatFileSize(bytes: number | undefined, tr: Translations) {
    if (!bytes || bytes === 0) return tr.zeroBytes
    const k = 1024
    const sizes = [tr.bytes, tr.kb, tr.mb, tr.gb]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 10) / 10 + ' ' + sizes[i]
  }

  function onHandleFileRemove(e: MouseEvent) {
    e.stopPropagation()
    handleFileRemove(fileId)
  }

  function onHandleEditImage(e: MouseEvent) {
    e.stopPropagation()
    const file = get(files).get(fileId)
    if (file) openImageEditor(file)
  }
</script>

<div
  class={cn('upup-inline-block', $themeSlots?.filePreview?.root)}
  data-testid="upup-file-preview"
  data-upup-slot="file-preview"
>
  <div
    class={cn(
      'upup-relative upup-h-[145px] upup-w-[145px] upup-overflow-hidden upup-rounded-lg upup-bg-white upup-shadow-sm',
      'upup-bg-contain upup-bg-center upup-bg-no-repeat',
      {
        [$slotClasses.fileThumbnailMultiple ?? '']: !!$slotClasses.fileThumbnailMultiple && $files.size > 1,
        [$slotClasses.fileThumbnailSingle ?? '']: !!$slotClasses.fileThumbnailSingle && $files.size === 1,
      },
      $themeSlots?.filePreview?.thumbnail,
    )}
    style={isImage ? `background-image: url(${fileUrl})` : undefined}
  >
    <button
      type="button"
      aria-label={fileName}
      class="upup-absolute upup-inset-0 upup-z-0 upup-cursor-pointer"
      {onclick}
    ></button>
    {#if !isImage}
      <div class="upup-flex upup-h-full upup-items-center upup-justify-center upup-p-6">
        <FilePreviewThumbnail
          {canPreview}
          {fileType}
          {fileName}
          {fileUrl}
          {fileSize}
          {allowPreview}
          slotClasses={$slotClasses}
          labels={tr}
          onUpdateCanPreview={onUpdateCanPreview}
        />
      </div>
    {/if}

    {#if isImage && imageEditor.enabled}
      <button
        class={cn(
          'upup-absolute upup-right-1.5 upup-top-8 upup-z-10',
          'upup-flex upup-h-5 upup-w-5 upup-items-center upup-justify-center',
          'upup-rounded-full upup-bg-white upup-text-blue-600 upup-shadow-sm',
          'hover:upup-bg-white hover:upup-text-blue-700',
          'upup-ring-1 upup-ring-black/5',
          'disabled:upup-cursor-not-allowed disabled:upup-opacity-50',
        )}
        onclick={onHandleEditImage}
        type="button"
        disabled={!!progress}
        aria-label={tr.editImage}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          class="upup-h-3 upup-w-3"
          aria-hidden="true"
        >
          <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
        </svg>
      </button>
    {/if}

    <button
      class={cn(
        'upup-absolute upup-right-1.5 upup-top-1.5 upup-z-10',
        'upup-flex upup-h-5 upup-w-5 upup-items-center upup-justify-center',
        'upup-rounded-full upup-bg-white upup-text-red-600 upup-shadow-sm',
        'hover:upup-bg-white hover:upup-text-red-700',
        'upup-ring-1 upup-ring-black/5',
        'disabled:upup-cursor-not-allowed disabled:upup-opacity-50',
        $slotClasses.fileDeleteButton,
        $themeSlots?.filePreview?.deleteButton,
      )}
      onclick={onHandleFileRemove}
      type="button"
      disabled={!!progress}
      aria-label={tr.removeFile}
      data-testid="upup-file-remove"
    >
      <FileDeleteIcon class="upup-h-3 upup-w-3" />
    </button>

    <ProgressBar
      class="upup-absolute upup-bottom-0 upup-left-0 upup-right-0"
      progressBarClassName="upup-rounded-t-none upup-rounded-b-md"
      {progress}
    />
  </div>

  <div class="upup-mt-1 upup-px-0.5">
    <div
      class={cn(
        'upup-truncate upup-text-[13px] upup-font-normal upup-leading-tight upup-text-gray-900',
        { 'upup-text-white': $isDarkTheme },
        $themeSlots?.filePreview?.name,
      )}
    >
      {fileName}
    </div>
    <div
      class={cn(
        'upup-mt-0.5 upup-text-[11px] upup-leading-tight upup-text-gray-500',
        { 'upup-text-gray-400': $isDarkTheme },
        $themeSlots?.filePreview?.size,
      )}
    >
      {formatFileSize(fileSize, tr)}
    </div>
    {#if allowPreview && canPreview}
      <button
        type="button"
        class={cn(
          'upup-mt-1 upup-text-[11px] upup-font-normal upup-leading-tight upup-text-[#2563eb] upup-transition-all hover:upup-text-blue-700 hover:upup-underline',
          { 'upup-text-[#4A9EFF] hover:upup-text-blue-300': $isDarkTheme },
          $themeSlots?.filePreview?.previewButton,
        )}
        onclick={() => onRequestPreview?.()}
      >
        {tr.clickToPreview}
      </button>
    {/if}
  </div>
</div>
