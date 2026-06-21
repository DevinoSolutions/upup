<script lang="ts">
  import { ICONS, cn, type IconName } from '@upup/core'
  let {
    name,
    size = undefined,
    class: className = '',
  }: { name: IconName; size?: number; class?: string } = $props()
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
