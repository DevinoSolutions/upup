<script lang="ts">
  import type { Snippet } from 'svelte'
  import { useUploaderOptions } from '../../context/root-context'
  let { if: condition, isLoading = false, children }:
    { if: boolean; isLoading?: boolean; children?: Snippet } = $props()
  const { icons } = useUploaderOptions()
  const Loader = icons.LoaderIcon
</script>

{#if isLoading}
  <Loader />
{:else if condition}
  {@render children?.()}
{/if}
