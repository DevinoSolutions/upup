<script lang="ts">
  import { cn, fileTypeIconName } from '@upup/core'
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

<span class="upup-inline-flex" data-testid="upup-file-icon" data-upup-slot="file-icon">
  <Icon name={fileTypeIconName(extension)} class={iconClass} />
</span>
