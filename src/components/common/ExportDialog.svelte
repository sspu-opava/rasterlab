<script lang="ts">
  import { onMount } from 'svelte';
  import { Download, X } from '@lucide/svelte';
  import { documentStore, exportCurrentDocument, busy } from '../../lib/editor/store';
  import type { ExportFormat } from '../../lib/project/export';
  let { onclose }: { onclose: () => void } = $props();
  let dialog: HTMLDialogElement;
  let format = $state<ExportFormat>('png'); let quality = $state(0.92);
  onMount(() => dialog.showModal());
</script>
<dialog bind:this={dialog} oncancel={event => { if ($busy) event.preventDefault(); else onclose(); }} class="new-document-dialog">
  <form onsubmit={async event => { event.preventDefault(); if (await exportCurrentDocument(format, quality)) onclose(); }}>
    <div class="dialog-heading"><Download size={20}/><h2>Export dokumentu</h2><button type="button" class="icon-button" disabled={$busy} onclick={onclose} aria-label="Zavřít export"><X size={18}/></button></div>
    <p>Celý dokument · {$documentStore.width} × {$documentStore.height} px<br/>Zoom a posun pracovní plochy export neovlivní.</p>
    <label class="property-wide"><span>Formát</span><select aria-label="Formát exportu" bind:value={format} disabled={$busy}><option value="png">PNG · bezeztrátově</option><option value="jpeg">JPEG · bílé pozadí</option><option value="webp">WebP</option></select></label>
    {#if format !== 'png'}<label class="opacity-control"><span>Kvalita</span><input type="range" aria-label="Kvalita exportu" min="0.1" max="1" step="0.01" bind:value={quality} disabled={$busy}/><output>{Math.round(quality * 100)}%</output></label>{/if}
    <div class="dialog-actions"><button type="button" class="small-button" disabled={$busy} onclick={onclose}>Zrušit</button><button class="primary-button" type="submit" disabled={$busy}><Download size={15}/> {$busy ? 'Exportuji…' : 'Exportovat'}</button></div>
  </form>
</dialog>
