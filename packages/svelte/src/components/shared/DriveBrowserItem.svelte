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
    'upup-fx-hover-lift upup-group upup-mb-1.5 upup-flex upup-cursor-pointer upup-items-center upup-justify-between upup-gap-2 upup-rounded-[11px] upup-px-3 upup-py-2.5 upup-ring-1',
    {
      'upup-font-medium': isFolder,
    },
    isFileSelected
      ? $dark
        ? 'upup-bg-[#0ea5e9]/10 upup-ring-[#38bdf8]/35'
        : 'upup-bg-[#0ea5e9]/10 upup-ring-[#0ea5e9]/40'
      : $dark
        ? 'upup-bg-white/[0.04] upup-ring-white/[0.06] hover:upup-bg-white/[0.07]'
        : 'upup-bg-black/[0.03] upup-ring-black/[0.06] hover:upup-bg-black/[0.05]',
    {
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
