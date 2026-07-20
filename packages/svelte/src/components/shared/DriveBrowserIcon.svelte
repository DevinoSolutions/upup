<script lang="ts">
  import { type DriveFile } from '@upupjs/core'
import { cn, b64EncodeUnicode } from '@upupjs/core/internal'
  import { useUploaderTheme } from '../../context/uploader-context'
  import Icon from '../Icon.svelte'

  const { file }: { file: DriveFile } = $props()
  const { isDark: dark } = useUploaderTheme()

  function handleImgError(e: Event) {
    const img = e.target as HTMLImageElement
    const svg = `<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M14 3v4a1 1 0 0 0 1 1h4"></path><path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z"></path></svg>`
    img.src = `data:image/svg+xml;base64,${b64EncodeUnicode(svg)}`
    img.onerror = null
  }
</script>

{#if file.isFolder}
  <i class="upup-flex-grow upup-text-lg">
    <!-- Amber filled folder in both themes — folders read unmistakably as folders. -->
    <Icon name="folder-filled" class="upup-text-[#fbbf24]" />
  </i>
{:else if !file.thumbnail}
  <i class="upup-flex-grow upup-text-lg">
    <Icon
      name="file"
      class={cn({
        'upup-text-[#6D6D6D] dark:upup-text-[#6D6D6D]': $dark,
      })}
    />
  </i>
{:else}
  <img
    src={file.thumbnail}
    alt={file.name}
    class="upup-h-5 upup-w-5 upup-flex-grow upup-rounded-md upup-shadow"
    onerror={handleImgError}
  />
{/if}
