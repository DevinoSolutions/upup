<script lang="ts">
  import { ICONS, type IconName } from '@useupup/core'
import { cn } from '@useupup/core/internal'
  let {
    name,
    size = undefined,
    class: className = '',
  }: {
    name: IconName
    size?: number | undefined
    class?: string | undefined
  } = $props()
  const def = $derived(ICONS[name])
  const px = $derived(size ?? def.defaultSize)
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox={def.viewBox}
  width={px}
  height={px}
  {...def.attrs}
  class={cn(def.className, className)}
>{@html def.inner}</svg>
