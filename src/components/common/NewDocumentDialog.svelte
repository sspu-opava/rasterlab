<script lang="ts">
  import { X, FilePlus2 } from '@lucide/svelte';
  import { newDocument, reportError } from '../../lib/editor/store';
  let { onclose }: { onclose: () => void } = $props();
  let dialog: HTMLDialogElement;
  let width = $state(1000);
  let height = $state(1000);
  import { onMount } from 'svelte';
  onMount(() => dialog.showModal());
  function submit(event: SubmitEvent): void {
    event.preventDefault();
    try { newDocument(width, height); onclose(); } catch (error) { reportError(error); }
  }
</script>

<dialog bind:this={dialog} oncancel={onclose} class="new-document-dialog">
  <form onsubmit={submit}>
    <div class="dialog-heading"><FilePlus2 size={20}/><h2>Nový dokument</h2><button type="button" class="icon-button" onclick={onclose} aria-label="Zavřít"><X size={18}/></button></div>
    <p>Prázdné plátno pro nový experiment.</p>
    <div class="property-grid"><label><span>Šířka / px</span><input type="number" bind:value={width} required min="1" max="8192" step="1"/></label><label><span>Výška / px</span><input type="number" bind:value={height} required min="1" max="8192" step="1"/></label></div>
    <div class="dialog-actions"><button type="button" class="small-button" onclick={onclose}>Zrušit</button><button class="primary-button" type="submit">Vytvořit dokument</button></div>
  </form>
</dialog>
