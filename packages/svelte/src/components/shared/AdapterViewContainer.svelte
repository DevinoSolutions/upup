<script lang="ts">
  import { useUploaderTheme } from '../../context/root-context'
  import { cn } from '@upup/core'
  import type { Snippet } from 'svelte'

  const { isLoading = false, children, ...rest }: { isLoading?: boolean; children?: Snippet; [key: string]: unknown } = $props()

  const { isDark: dark, slotOverrides: slotClasses } = useUploaderTheme()
</script>

<div
  data-testid="upup-adapter-view"
  class={cn(
    'upup-flex upup-items-center upup-justify-center upup-overflow-hidden upup-bg-black/[0.075]',
    {
      'upup-bg-white/10 upup-text-[#FAFAFA] dark:upup-bg-white/10 dark:upup-text-[#FAFAFA]': isLoading && $dark,
      [$slotClasses.adapterView!]: !isLoading && !!$slotClasses.adapterView,
      [$slotClasses.driveLoading!]: isLoading && !!$slotClasses.driveLoading,
    },
  )}
  {...rest}
>
  {@render children?.()}
</div>
