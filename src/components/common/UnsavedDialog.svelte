<script lang="ts">
  import { onMount } from 'svelte';
  let { ondecision }: { ondecision: (decision: 'save' | 'discard' | 'cancel') => void } = $props();
  let dialog: HTMLDialogElement;
  onMount(() => dialog.showModal());
</script>
<dialog class="new-document-dialog" bind:this={dialog} oncancel={() => ondecision('cancel')} aria-labelledby="unsaved-title">
  <h2 id="unsaved-title">Uložit rozpracovaný projekt?</h2>
  <p>Projekt obsahuje neuložené změny.</p>
  <div class="dialog-actions">
    <button class="small-button" onclick={() => ondecision('cancel')}>Zrušit</button>
    <button class="small-button" onclick={() => ondecision('discard')}>Zahodit změny</button>
    <button class="primary-button" onclick={() => ondecision('save')}>Uložit</button>
  </div>
</dialog>
