<script lang="ts">
  import { useUploaderFiles, useUploaderI18n, useUploaderRuntime, useUploaderSource, useUploaderTheme, useUploaderView } from '../context/uploader-context'
  import useUploaderPanel from '../composables/useUploaderPanel'
  import { cn } from '@upup/core'
  import SourceView from './SourceView.svelte'
  import SourceSelector from './SourceSelector.svelte'
  import FileList from './FileList.svelte'

  const { files } = useUploaderFiles()
  const { activeAdapter } = useUploaderSource()
  const { isAddingMore } = useUploaderView()
  const { isOnline, getFileInput, openFilePicker } = useUploaderRuntime()
  const { translations: tr } = useUploaderI18n()
  const { isDark: dark } = useUploaderTheme()
  const { isDragging, absoluteIsDragging, absoluteHasBorder, handleDragOver, handleDragLeave, handleDrop, handlePaste } = useUploaderPanel()

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      const el = getFileInput()
      if (el) {
        el.removeAttribute('webkitdirectory')
        el.removeAttribute('directory')
      }
      openFilePicker()
    }
  }
</script>

<div
  data-testid="upup-dropzone"
  data-upup-slot="main-box"
  role="button"
  tabindex={0}
  aria-label={tr.dropzoneLabel}
  aria-dropeffect={$isDragging ? 'copy' : 'none'}
  onkeydown={onKeyDown}
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
  {#if !$isOnline}
    <div class={cn('upup-absolute upup-inset-x-0 upup-top-0 upup-z-20 upup-px-3 upup-py-1.5 upup-text-center upup-text-xs upup-font-medium upup-text-white upup-bg-yellow-500', { 'upup-bg-yellow-600': $dark })}>
      No internet connection — uploads will resume when you reconnect.
    </div>
  {/if}
  {#if !!$activeAdapter}<SourceView />{/if}
  {#if !$activeAdapter && ($isAddingMore || !$files.size)}<SourceSelector />{/if}
  <FileList />
</div>
