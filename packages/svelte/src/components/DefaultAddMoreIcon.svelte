<script lang="ts">
  // Default 'add more' glyph — renders the shared registry 'plus' icon (parity with
  // React's DefaultPlusIconComponent). Forwards the consumer's class/size to the svg.
  import Icon from './Icon.svelte'
  let {
    class: className = '',
    size = undefined,
  }: { class?: string; size?: number } = $props()
</script>

<Icon name="plus" class={className} {size} />
