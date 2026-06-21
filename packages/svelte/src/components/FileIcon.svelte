<script lang="ts">
  import { cn } from '@upup/core'
  import { useUploaderTheme } from '../context/root-context'
  import Icon from './Icon.svelte'

  let { extension = '', class: className = '' }: { extension?: string; class?: string } = $props()

  const { isDark: dark } = useUploaderTheme()

  const iconClass = $derived(
    cn('upup-text-5xl upup-text-blue-600', className, {
      'upup-text-[#59D1F9] dark:upup-text-[#59D1F9]': $dark,
    }),
  )
</script>

<div class="upup-flex upup-flex-col upup-items-center upup-gap-0.5">
  <Icon name="file" class={iconClass} />
  {#if extension}
    <span class="upup-text-[10px] upup-font-medium upup-uppercase upup-text-gray-500">
      {extension}
    </span>
  {/if}
</div>
