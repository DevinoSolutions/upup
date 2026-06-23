<script lang="ts">
  // Default file-delete glyph — renders the shared registry 'trash' icon (parity with
  // React's react-icons TbTrash default). Forwards the consumer's class/size to the svg.
  import Icon from './Icon.svelte'
  let {
    class: className = '',
    size = undefined,
  }: { class?: string; size?: number } = $props()
</script>

<Icon name="trash" class={className} {size} />
