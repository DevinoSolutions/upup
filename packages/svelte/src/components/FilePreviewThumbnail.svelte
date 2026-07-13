<script lang="ts">
  import type { Translations } from '@upupjs/core'
import type { InternalFlatClassNames } from '@upupjs/core/internal'
  import { fileGetExtension, fileGetIsPdf, fileGetIsText, fileIs3D, cn } from '@upupjs/core/internal'
  import FileIcon from './FileIcon.svelte'

  let {
    canPreview,
    fileType,
    fileName,
    fileUrl,
    fileSize,
    slotClasses,
    allowPreview,
    labels,
    onUpdateCanPreview,
  }: {
    canPreview: boolean
    fileType: string
    fileName: string
    fileUrl: string
    fileSize?: number | undefined
    slotClasses: InternalFlatClassNames
    allowPreview: boolean
    labels: Translations
    onUpdateCanPreview?: ((val: boolean) => void) | undefined
  } = $props()

  const extension = $derived(fileGetExtension(fileType, fileName))
  const is3D = $derived(fileIs3D(extension?.toLowerCase() ?? ''))
  const isPdf = $derived(fileGetIsPdf(fileType, fileName))
  // Text files render as a static doc icon (cross-framework parity).
  const isText = $derived(fileGetIsText(fileType, fileName))

  function onObjectLoad() {
    onUpdateCanPreview?.(true)
  }
</script>

{#if isPdf || is3D || isText}
  <!-- PDFs, 3D files, and text -> static icon -->
  <div class="upup-flex upup-flex-col upup-items-center upup-gap-2">
    <FileIcon {extension} class={slotClasses.fileIcon} />
  </div>
{:else}
  {#if !canPreview}
    <object
      data={fileUrl}
      width="0%"
      height="0%"
      name={fileName}
      title={fileName}
      type={fileType}
      onload={onObjectLoad}
    >
      <p>{labels.loading}</p>
    </object>
    <FileIcon {extension} />
  {/if}

  {#if canPreview}
    <FileIcon
      {extension}
      class={cn(
        { 'md:upup-hidden': allowPreview },
        slotClasses.fileIcon,
      )}
    />
    <div
      class={cn(
        `upup-relative upup-hidden upup-h-full upup-w-full ${allowPreview ? 'md:upup-block' : ''}`,
      )}
    >
      <object
        data={fileUrl}
        width="100%"
        height="100%"
        name={fileName}
        title={fileName}
        type={fileType}
        class="upup-absolute upup-h-full upup-w-full"
      >
        <p>{labels.loading}</p>
      </object>
    </div>
  {/if}
{/if}
