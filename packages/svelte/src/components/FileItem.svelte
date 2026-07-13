<script lang="ts">
  import type { UploadFile } from '@useupup/core'
  import { cn } from '@useupup/core/internal'
  import {
    useUploaderFiles,
    useUploaderOptions,
    useUploaderRuntime,
    useUploaderTheme,
  } from '../context/uploader-context'
  import FilePreview from './FilePreview.svelte'
  import FilePreviewPortal from './FilePreviewPortal.svelte'

  let { file }: { file: UploadFile } = $props()

  const { core } = useUploaderRuntime()
  const { files } = useUploaderFiles()
  const { onFileClick } = useUploaderOptions()
  const { slotOverrides: slotClasses } = useUploaderTheme()

  let showPreviewPortal = $state(false)
  let canPreview = $state(false)

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
  class={cn(
    'upup-relative upup-flex upup-flex-1 upup-flex-col upup-items-start upup-gap-1 upup-bg-transparent',
    {
      [$slotClasses.fileItemMultiple ?? '']: !!$slotClasses.fileItemMultiple && $files.size > 1,
      [$slotClasses.fileItemSingle ?? '']: !!$slotClasses.fileItemSingle && $files.size === 1,
    },
  )}
>
  <FilePreview
    fileName={file.name}
    fileType={file.type ?? ''}
    fileId={file.id}
    fileUrl={file.url ?? ''}
    fileSize={file.size}
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
</div>
