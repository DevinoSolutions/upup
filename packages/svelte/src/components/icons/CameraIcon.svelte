<script lang="ts">
  import Icon from '../Icon.svelte'
  let { class: className = undefined }: { class?: string } = $props()
</script>
<Icon name="camera" class={className} />
