<script lang="ts">
  import { type DriveFile } from '@upupjs/core'
import { cn } from '@upupjs/core/internal'
  import { useUploaderTheme } from '../../context/uploader-context'
  import DriveBrowserIcon from './DriveBrowserIcon.svelte'

  const { file, handleClick, selectedFiles }: {
    file: DriveFile
    handleClick: (file: DriveFile) => void | Promise<void>
    selectedFiles: DriveFile[]
  } = $props()

  const { isDark: dark, slotOverrides: slotClasses } = useUploaderTheme()

  const isFolder = $derived(file.isFolder)
  const isFileSelected = $derived(selectedFiles.filter((f) => f.id === file.id).length)
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  data-upup-slot="drive-browser-item"
  class={cn(
    'upup-hover:bg-[#bab4b499] upup-group upup-mb-1 upup-flex upup-cursor-pointer upup-items-center upup-justify-between upup-gap-2 upup-rounded-md upup-p-1 upup-py-2 upup-transition-colors upup-duration-150',
    {
      'upup-font-medium': isFolder,
      'upup-bg-[#bab4b499]': isFileSelected,
      'upup-bg-[#e9ecef00]': !isFileSelected,
      [$slotClasses.driveItemContainerDefault!]:
        !isFileSelected && $slotClasses.driveItemContainerDefault,
      [$slotClasses.driveItemContainerSelected!]:
        isFileSelected && $slotClasses.driveItemContainerSelected,
    },
  )}
  onclick={() => handleClick(file)}
>
  <div
    class={cn(
      'upup-flex upup-items-center upup-gap-2',
      $slotClasses.driveItemContainerInner,
    )}
  >
    <DriveBrowserIcon {file} />
    <h1
      class={cn(
        'upup-text-wrap upup-break-all upup-text-xs',
        {
          'upup-text-[#e0e0e0] dark:upup-text-[#e0e0e0]': $dark,
        },
        $slotClasses.driveItemInnerText,
      )}
    >
      {file.name}
    </h1>
  </div>
</div>
