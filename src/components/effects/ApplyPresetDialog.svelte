<script lang="ts">
  import { onMount } from 'svelte';
  import { X } from '@lucide/svelte';
  import { flattenLayers, presetWarnings, type EffectPreset } from '../../lib/presets/presets';
  import { documentStore, busy, applyPreset } from '../../lib/editor/store';
  let { preset, layerId, onclose }: { preset: EffectPreset; layerId: string; onclose: () => void } = $props();
  let dialog: HTMLDialogElement;
  let bindings = $state<Record<string, string>>({});
  let replace = $state(false);
  let error = $state('');
  const warnings = $derived(presetWarnings(preset));
  onMount(() => dialog.showModal());
  function submit(event: SubmitEvent): void { event.preventDefault(); try { applyPreset(layerId, preset, bindings, replace); onclose(); } catch (reason) { error = reason instanceof Error ? reason.message : 'Preset nelze použít.'; } }
</script>
<dialog bind:this={dialog} oncancel={onclose} class="new-document-dialog preset-dialog">
  <form onsubmit={submit}>
    <div class="dialog-heading"><h2>Použít preset</h2><button type="button" class="icon-button" aria-label="Zavřít preset" onclick={onclose}><X size={18}/></button></div>
    <p><strong>{preset.name}</strong> · {preset.effects.length} efektů<br/>Cíl: {$documentStore.layers.find(layer => layer.id === layerId)?.name}</p>
    <ol class="preset-effect-list">{#each preset.effects as effect}<li>{effect.effectId}{#if !effect.enabled} · vypnutý{/if}</li>{/each}</ol>
    {#each preset.roles as role}<label class="property-wide"><span>{role.label}</span><select aria-label={`Zdroj presetu: ${role.label}`} required bind:value={bindings[role.id]}><option value="">Vyberte vrstvu…</option>{#each flattenLayers($documentStore.layers).filter(layer => layer.id !== layerId) as layer}<option value={layer.id}>{layer.name}{!layer.visible ? ' · skrytá' : ''}</option>{/each}</select></label>{/each}
    <label class="property-wide"><span>Umístění</span><select aria-label="Umístění presetu" bind:value={replace}><option value={false}>Přidat na konec stacku</option><option value={true}>Nahradit celý stack</option></select></label>
    {#if replace}<p>Stávající efekty budou nahrazeny. Změnu lze vrátit jedním undo.</p>{/if}
    {#each warnings as warning}<p class="effect-error">{warning}</p>{/each}
    {#if error}<p role="alert" class="effect-error">{error}</p>{/if}
    <div class="dialog-actions"><button type="button" class="small-button" onclick={onclose}>Zrušit</button><button class="primary-button" disabled={$busy} type="submit">Použít preset</button></div>
  </form>
</dialog>
