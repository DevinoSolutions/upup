<script lang="ts">
  import { useUploaderFiles, useUploaderI18n, useUploaderRuntime, useUploaderSource, useUploaderTheme, useUploaderUploadControls, useUploaderView } from '../context/uploader-context'
  import useUploaderPanel from '../composables/useUploaderPanel'
  import { cn } from '@useupup/core/internal'
  import { UploadStatus } from '@useupup/core'
  import SourceView from './SourceView.svelte'
  import SourceSelector from './SourceSelector.svelte'
  import FileList from './FileList.svelte'

  const { files } = useUploaderFiles()
  const { activeSource } = useUploaderSource()
  const { isAddingMore } = useUploaderView()
  const { isOnline } = useUploaderRuntime()
  const { translations: tr } = useUploaderI18n()
  const { isDark: dark } = useUploaderTheme()
  const { upload: { uploadStatus } } = useUploaderUploadControls()
  const { isDragging, absoluteIsDragging, absoluteHasBorder, handleDragOver, handleDragLeave, handleDrop, handlePaste } = useUploaderPanel()
</script>

<div
  data-testid="upup-dropzone"
  data-upup-slot="uploader-panel"
  role="region"
  aria-label={tr.dropzoneLabel}
  aria-dropeffect={$isDragging ? 'copy' : 'none'}
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
  onpaste={handlePaste}
  class={cn('upup-relative upup-flex-1 upup-overflow-hidden upup-rounded-lg', {
    'upup-border upup-border-[#1849D6]': $absoluteHasBorder,
    'upup-border-[#30C5F7] dark:upup-border-[#30C5F7]': $absoluteHasBorder && $dark,
    'upup-border-dashed': !$isDragging,
    'upup-bg-[#E7ECFC] upup-backdrop-blur-sm': $absoluteIsDragging && !$dark,
    'upup-bg-[#045671] upup-backdrop-blur-sm dark:upup-bg-[#045671]': $absoluteIsDragging && $dark,
  })}
>
  <div role="status" aria-live="polite" class="upup-sr-only">
    {$uploadStatus === UploadStatus.UPLOADING ? tr.announceUploadStarted : $uploadStatus === UploadStatus.SUCCESSFUL ? tr.announceUploadComplete : $uploadStatus === UploadStatus.FAILED ? tr.announceUploadFailed : ''}
  </div>
  {#if !$isOnline}
    <div class={cn('upup-absolute upup-inset-x-0 upup-top-0 upup-z-20 upup-px-3 upup-py-1.5 upup-text-center upup-text-xs upup-font-medium upup-text-white upup-bg-yellow-500', { 'upup-bg-yellow-600': $dark })}>
      No internet connection — uploads will resume when you reconnect.
    </div>
  {/if}
  {#if !!$activeSource}<SourceView />{/if}
  {#if !$activeSource && ($isAddingMore || !$files.size)}<SourceSelector />{/if}
  <FileList />
</div>
