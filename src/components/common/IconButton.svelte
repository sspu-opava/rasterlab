<script lang="ts">
  import type { Snippet } from 'svelte';
  let { label, onclick, active = false, disabled = false, children }: {
    label: string; onclick?: () => void; active?: boolean; disabled?: boolean; children: Snippet;
  } = $props();
</script>

<button class="icon-button" class:active title={label} aria-label={label} {disabled} {onclick}>
  {@render children()}
</button>
