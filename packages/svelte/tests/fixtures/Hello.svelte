<script lang="ts">
  let { name = 'world' }: { name?: string } = $props()
</script>

<p class="upup-greeting">hello {name}</p>
