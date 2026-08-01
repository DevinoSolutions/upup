<script lang="ts">
  import type { UploadFile } from '@upupjs/core'
  import { cn } from '@upupjs/core/internal'
  import {
    useUploaderFiles,
    useUploaderOptions,
    useUploaderRuntime,
    useUploaderTheme,
    useUploaderView,
  } from '../context/uploader-context'
  import FilePreview from './FilePreview.svelte'
  import FilePreviewPortal from './FilePreviewPortal.svelte'
  import FileRow from './FileRow.svelte'

  let {
    file,
    index = 0,
    forcedList = false,
  }: {
    file: UploadFile
    /** Position in the sorted list — drives the entrance stagger. */
    index?: number
    /** True when the panel forces the row list (tiles don't fit one row). */
    forcedList?: boolean
  } = $props()

  const { core } = useUploaderRuntime()
  const { files, leavingFileIds } = useUploaderFiles()
  const { viewMode } = useUploaderView()
  const { onFileClick } = useUploaderOptions()
  const { slotOverrides: slotClasses } = useUploaderTheme()

  let showPreviewPortal = $state(false)
  let canPreview = $state(false)

  const leaving = $derived($leavingFileIds.has(file.id))

  function openPreviewPortal() {
    showPreviewPortal = true
    core?.emit('file-preview-open', { fileId: file.id, fileName: file.name })
  }

  function closePreviewPortal() {
    showPreviewPortal = false
    core?.emit('file-preview-close', { fileId: file.id, fileName: file.name })
  }

  function onStopPropagation(e: MouseEvent) {
    e.stopPropagation()
  }
</script>

<div
  data-testid="upup-file-item"
  data-upup-slot="file-item"
  role="listitem"
  class={cn(
    'upup-animate-fx-enter',
    'upup-relative upup-flex upup-flex-1 upup-flex-col upup-items-start upup-gap-1 upup-bg-transparent',
    leaving && 'upup-animate-fx-exit upup-overflow-hidden',
    {
      [$slotClasses.fileItemMultiple ?? '']: !!$slotClasses.fileItemMultiple && $files.size > 1,
      [$slotClasses.fileItemSingle ?? '']: !!$slotClasses.fileItemSingle && $files.size === 1,
    },
  )}
  style={leaving ? undefined : `animation-delay: ${Math.min(index, 8) * 40}ms`}
>
  {#if $viewMode === 'list' || forcedList}
    <FileRow {file} {index} />
  {:else}
    <FilePreview
      fileName={file.name}
      fileType={file.type ?? ''}
      fileId={file.id}
      fileUrl={file.url ?? ''}
      fileSize={file.size}
      {index}
      {canPreview}
      onRequestPreview={openPreviewPortal}
      onUpdateCanPreview={(val) => (canPreview = val)}
      onclick={() => onFileClick(file)}
    />

    {#if canPreview && showPreviewPortal}
      <FilePreviewPortal
        fileType={file.type ?? ''}
        fileUrl={file.url ?? ''}
        fileName={file.name}
        fileSize={file.size}
        onClose={closePreviewPortal}
        {onStopPropagation}
      />
    {/if}
  {/if}
</div>
