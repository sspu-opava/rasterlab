<script lang="ts">
  import { onMount } from 'svelte';
  import { X } from '@lucide/svelte';
  import { capturePreset } from '../../lib/editor/store';
  import { storePreset, libraryError } from '../../lib/presets/library';
  let { layerId, effectId, onclose }: { layerId: string; effectId?: string; onclose: () => void } = $props();
  let dialog: HTMLDialogElement;
  let name = $state('');
  let error = $state('');
  onMount(() => dialog.showModal());
  function submit(event: SubmitEvent): void { event.preventDefault(); try { if (storePreset(capturePreset(layerId, name, effectId))) onclose(); } catch (reason) { error = reason instanceof Error ? reason.message : 'Preset nelze uložit.'; } }
</script>
<dialog bind:this={dialog} class="new-document-dialog" oncancel={onclose}>
  <form onsubmit={submit}>
    <div class="dialog-heading"><h2>Uložit preset</h2><button type="button" class="icon-button" aria-label="Zavřít uložení presetu" onclick={onclose}><X size={18}/></button></div>
    <p>{effectId ? 'Parametry vybraného efektu' : 'Celý stack efektů'} se uloží do místní knihovny. Vstupy se při použití přiřadí znovu.</p>
    <label class="property-wide"><span>Název</span><input aria-label="Název presetu" bind:value={name} required maxlength="80"/></label>
    {#if error || $libraryError}<p role="alert" class="effect-error">{error || $libraryError}</p>{/if}
    <div class="dialog-actions"><button type="button" class="small-button" onclick={onclose}>Zrušit</button><button class="primary-button" type="submit" disabled={!name.trim()}>Uložit preset</button></div>
  </form>
</dialog>
