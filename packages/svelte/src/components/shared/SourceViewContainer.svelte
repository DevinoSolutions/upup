<script lang="ts">
  import { useUploaderTheme } from '../../context/uploader-context'
  import { cn } from '@upupjs/core/internal'
  import type { Snippet } from 'svelte'

  const { isLoading = false, children, ...rest }: { isLoading?: boolean; children?: Snippet; [key: string]: unknown } = $props()

  const { isDark: dark, slotOverrides: slotClasses } = useUploaderTheme()
</script>

<div
  data-testid="upup-source-view"
  class={cn(
    // Transparent by design: the view body sits directly on the panel's
    // gradient chrome (the old black/[0.075] wash read as a mismatched gray
    // block over the light gradient).
    'upup-flex upup-items-center upup-justify-center upup-overflow-hidden',
    {
      'upup-text-[#FAFAFA] dark:upup-text-[#FAFAFA]': isLoading && $dark,
      [$slotClasses.sourceView!]: !isLoading && !!$slotClasses.sourceView,
      [$slotClasses.driveLoading!]: isLoading && !!$slotClasses.driveLoading,
    },
  )}
  {...rest}
>
  {@render children?.()}
</div>
