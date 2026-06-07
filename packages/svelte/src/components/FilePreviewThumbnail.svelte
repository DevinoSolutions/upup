<script lang="ts">
  import type { InternalFlatClassNames, Translations } from '@upup/core'
  import {
    fileCanPreviewText,
    fileGetExtension,
    fileGetIsPdf,
    fileGetIsText,
    fileIs3D,
    cn,
  } from '@upup/core'
  import FileIcon from './FileIcon.svelte'
  import ShouldRender from './shared/ShouldRender.svelte'

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
    fileSize?: number
    slotClasses: InternalFlatClassNames
    allowPreview: boolean
    labels: Translations
    onUpdateCanPreview?: (val: boolean) => void
  } = $props()

  const extension = $derived(fileGetExtension(fileType, fileName))
  const is3D = $derived(fileIs3D(extension?.toLowerCase() ?? ''))
  const isPdf = $derived(fileGetIsPdf(fileType, fileName))
  const isOversizedText = $derived(() => {
    const isText = fileGetIsText(fileType, fileName)
    return isText && !fileCanPreviewText(fileType, fileName, fileSize)
  })

  function onObjectLoad() {
    onUpdateCanPreview?.(true)
  }
</script>

{#if isPdf || is3D || isOversizedText()}
  <!-- PDFs, 3D files, and oversized text -> static icon -->
  <div class="upup-flex upup-flex-col upup-items-center upup-gap-2">
    <FileIcon {extension} class={slotClasses.fileIcon} />
  </div>
{:else}
  <ShouldRender if={!canPreview}>
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
  </ShouldRender>

  <ShouldRender if={canPreview}>
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
  </ShouldRender>
{/if}
