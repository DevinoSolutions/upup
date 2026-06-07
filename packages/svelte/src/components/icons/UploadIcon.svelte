<script lang="ts">
  let { size = 24, class: className = '' }: { size?: number; class?: string } = $props()
</script>
<svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={className}>
  <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
  <polyline points="7 9 12 4 17 9" />
  <line x1="12" y1="4" x2="12" y2="16" />
</svg>
