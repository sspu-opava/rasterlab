<script lang="ts">
  import { onMount } from 'svelte';
  import { documentStore, updateDocument, reportError } from '../../lib/editor/store';
  let { onclose }: { onclose: () => void } = $props();
  let dialog: HTMLDialogElement;
  let name = $state($documentStore.name), width = $state($documentStore.width), height = $state($documentStore.height);
  const background = $documentStore.background;
  let color = $state(`#${[background.r, background.g, background.b].map(value => value.toString(16).padStart(2, '0')).join('')}`);
  let alpha = $state(background.a);
  onMount(() => dialog.showModal());
</script>
<dialog class="new-document-dialog" bind:this={dialog} oncancel={onclose} aria-labelledby="settings-title">
  <form onsubmit={event => { event.preventDefault(); try { updateDocument({ name, width, height, background: { r: parseInt(color.slice(1, 3), 16), g: parseInt(color.slice(3, 5), 16), b: parseInt(color.slice(5, 7), 16), a: alpha } }); onclose(); } catch (error) { reportError(error); } }}>
    <h2 id="settings-title">Nastavení dokumentu</h2>
    <label class="property-wide">Název<input aria-label="Název dokumentu" bind:value={name} required maxlength="256"/></label>
    <div class="property-grid">
      <label>Šířka / px<input aria-label="Šířka dokumentu" type="number" bind:value={width} min="1" max="8192" required step="1"/></label>
      <label>Výška / px<input aria-label="Výška dokumentu" type="number" bind:value={height} min="1" max="8192" required step="1"/></label>
      <label>Barva pozadí<input aria-label="Barva pozadí" type="color" bind:value={color}/></label>
      <label>Alfa pozadí<input aria-label="Alfa pozadí" type="number" bind:value={alpha} min="0" max="1" step="0.01" required/></label>
    </div>
    <p>Změna rozměrů mění plátno a rozměry generátorů. Pozice vrstev a parametry efektů v pixelech se nepřepočítávají. Náročné stacky podléhají limitu 512 MiB.</p>
    <div class="dialog-actions"><button type="button" class="small-button" onclick={onclose}>Zrušit</button><button class="primary-button" type="submit">Použít</button></div>
  </form>
</dialog>
